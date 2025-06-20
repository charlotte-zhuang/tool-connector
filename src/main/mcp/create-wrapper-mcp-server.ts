import { Configs } from "@/shared/schemas";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import {
  getDefaultEnvironment,
  StdioClientTransport,
} from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { ServerOptions } from "@modelcontextprotocol/sdk/server/index.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  CallToolRequestSchema,
  CallToolResult,
  CancelledNotificationSchema,
  ErrorCode,
  GetPromptRequestSchema,
  GetPromptResult,
  ListPromptsRequestSchema,
  ListPromptsResult,
  ListResourcesRequestSchema,
  ListResourcesResult,
  ListResourceTemplatesRequestSchema,
  ListResourceTemplatesResult,
  ListToolsRequestSchema,
  ListToolsResult,
  McpError,
  ProgressNotificationSchema,
  Prompt,
  PromptListChangedNotificationSchema,
  ReadResourceRequestSchema,
  ReadResourceResult,
  Resource,
  ResourceListChangedNotificationSchema,
  ResourceTemplate,
  ResourceUpdatedNotificationSchema,
  RootsListChangedNotificationSchema,
  SubscribeRequestSchema,
  Tool,
  ToolListChangedNotificationSchema,
  UnsubscribeRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { unwrapUri, wrapNameWithServer, wrapUriWithServer } from "./conversion";

const MAX_NAME_LENGTH = 64;

function createUniqueName({
  serverName,
  name,
  map,
}: {
  serverName: string;
  name: string;
  map: Map<string, unknown>;
}): string | null {
  // make a unique name
  let uniqueName = wrapNameWithServer({
    serverName,
    name,
  }).substring(0, MAX_NAME_LENGTH);

  let i = 1;
  while (map.has(uniqueName)) {
    // this is kind of ridiculous
    if (i > 16) {
      return null;
    }

    uniqueName = name + i;

    // cut from the front to make sure that i isn't cut off
    if (uniqueName.length > MAX_NAME_LENGTH) {
      uniqueName = uniqueName.substring(uniqueName.length - MAX_NAME_LENGTH);
    }

    i++;
  }

  return uniqueName;
}

async function handleListResources(
  clients: Map<string, Client>
): Promise<ListResourcesResult> {
  const allResources: Resource[] = [];

  for (const [serverName, client] of clients) {
    try {
      const { resources } = await client.listResources();

      for (const resource of resources) {
        allResources.push({
          ...resource,
          uri: wrapUriWithServer({
            serverName,
            uri: resource.uri,
          }),
        });
      }
    } catch {
      // ignore servers that do not support listing resources
    }
  }

  return { resources: allResources };
}

async function handleListResourceTemplates(
  clients: Map<string, Client>
): Promise<ListResourceTemplatesResult> {
  const allResourceTemplates: ResourceTemplate[] = [];

  for (const [serverName, client] of clients) {
    try {
      const { resourceTemplates } = await client.listResourceTemplates();

      for (const resourceTemplate of resourceTemplates) {
        allResourceTemplates.push({
          ...resourceTemplate,
          uriTemplate: wrapUriWithServer({
            serverName,
            uri: resourceTemplate.uriTemplate,
          }),
        });
      }
    } catch {
      // ignore servers that do not support listing resource templates
    }
  }

  return { resourceTemplates: allResourceTemplates };
}

export default async function createWrapperMcpServer({
  configs,
}: {
  configs: Configs["mcp_servers"];
}): Promise<McpServer> {
  const onCloseHooks: (() => Promise<void>)[] = [];
  try {
    // SETUP CLIENTS
    const defaultEnv = getDefaultEnvironment();

    const clients = new Map(
      await Promise.all(
        (configs ?? []).map(async (serverConfig): Promise<[string, Client]> => {
          let client = new Client({
            name: serverConfig.name,
            version: "1.0.0",
          });

          if (serverConfig.kind === "command") {
            const transport = new StdioClientTransport({
              command: serverConfig.command,
              args: serverConfig.args,
              env: {
                ...defaultEnv,
                ...serverConfig.env,
              },
            });
            onCloseHooks.push(() => transport.close());
            onCloseHooks.push(() => client.close());
            await client.connect(transport);
          } else {
            // try Streamable HTTP transport first
            let transport:
              | StreamableHTTPClientTransport
              | SSEClientTransport
              | null = null;
            try {
              transport = new StreamableHTTPClientTransport(
                new URL(serverConfig.url),
                {
                  requestInit: {
                    headers: serverConfig.headers,
                  },
                }
              );
              await client.connect(transport);
            } catch {
              // fallback to HTTP+SSE transport
              await Promise.all([
                client.close().catch(() => {}),
                transport?.close().catch(() => {}),
              ]);

              transport = new SSEClientTransport(new URL(serverConfig.url), {
                requestInit: {
                  headers: serverConfig.headers,
                },
              });

              client = new Client({
                name: serverConfig.name,
                version: "1.0.0",
              });

              await client.connect(transport);
            } finally {
              onCloseHooks.push(async () => {
                await transport?.close();
              });
              onCloseHooks.push(() => client.close());
            }
          }

          return [serverConfig.name, client];
        })
      )
    );
    // DONE SETTING UP CLIENTS

    // SETUP SERVER

    let externalToolNameMap = new Map<
      string,
      { serverName: string; toolName: string }
    >();

    let externalPromptNameMap = new Map<
      string,
      { serverName: string; promptName: string }
    >();

    // capabilities
    const allSubCapabilities = clients.entries().map(([serverName, client]) => {
      const subCapabilities = client.getServerCapabilities();

      if (subCapabilities === undefined) {
        return undefined;
      }

      const toolCapabilities: Required<
        Required<ServerOptions>["capabilities"]
      >["tools"] = Object.fromEntries(
        Object.values(subCapabilities.tools ?? {}).flatMap((toolCapability) => {
          if (typeof toolCapability !== "object") {
            return [];
          }
          if (toolCapability === null) {
            return [];
          }
          if (
            "name" in toolCapability &&
            typeof toolCapability.name === "string"
          ) {
            // make a unique name
            const toolName = createUniqueName({
              serverName,
              name: toolCapability.name,
              map: externalToolNameMap,
            });

            if (!toolName) {
              return [];
            }

            externalToolNameMap.set(toolName, {
              serverName,
              toolName: toolCapability.name,
            });

            return [
              [
                toolName,
                {
                  ...toolCapability,
                  name: toolName,
                },
              ],
            ];
          }

          return [];
        })
      );

      const promptCapabilities: Required<
        Required<ServerOptions>["capabilities"]
      >["prompts"] = Object.fromEntries(
        Object.entries(subCapabilities.prompts ?? {}).flatMap(
          (promptCapability) => {
            if (typeof promptCapability !== "object") {
              return [];
            }
            if (promptCapability === null) {
              return [];
            }
            if (
              "name" in promptCapability &&
              typeof promptCapability.name === "string"
            ) {
              const promptName = createUniqueName({
                serverName,
                name: promptCapability.name,
                map: externalPromptNameMap,
              });

              if (!promptName) {
                return [];
              }

              externalPromptNameMap.set(promptName, {
                serverName,
                promptName: promptCapability.name,
              });

              return [
                [
                  promptName,
                  {
                    ...promptCapability,
                    name: promptName,
                  },
                ],
              ];
            }

            return [];
          }
        )
      );

      const resourceCapabilities: Required<
        Required<ServerOptions>["capabilities"]
      >["resources"] = Object.fromEntries(
        Object.entries(subCapabilities.resources ?? {}).flatMap(
          ([resourceCapabilityKey, resourceCapabilityValue]) => {
            if (typeof resourceCapabilityValue !== "object") {
              return [];
            }
            if (resourceCapabilityValue === null) {
              return [];
            }
            if (
              "uri" in resourceCapabilityValue &&
              typeof resourceCapabilityValue.uri === "string"
            ) {
              return [
                [
                  wrapUriWithServer({
                    serverName,
                    uri: resourceCapabilityKey,
                  }),
                  {
                    ...resourceCapabilityValue,
                    uri: wrapUriWithServer({
                      serverName,
                      uri: resourceCapabilityValue.uri,
                    }),
                  },
                ],
              ];
            }

            return [];
          }
        )
      );

      return {
        tools: subCapabilities.tools
          ? {
              ...toolCapabilities,
              listChanged: subCapabilities.tools.listChanged,
            }
          : undefined,
        prompts: subCapabilities.prompts
          ? {
              ...promptCapabilities,
              listChanged: subCapabilities.prompts.listChanged,
            }
          : undefined,
        resources: subCapabilities.resources
          ? {
              ...resourceCapabilities,
              listChanged: subCapabilities.resources.listChanged,
              subscribe: subCapabilities.resources.subscribe,
            }
          : undefined,
      };
    });

    // instructions
    const allInstructions: {
      serverName: string;
      instructions?: string;
    }[] = Array.from(clients.entries()).map(([serverName, client]) => ({
      serverName,
      instructions: client.getInstructions(),
    }));

    const serverOptions: ServerOptions = {
      capabilities: allSubCapabilities.reduce((acc, subCapabilities) => {
        return {
          tools: {
            ...acc.tools,
            ...(subCapabilities?.tools ?? {}),
            listChanged:
              acc.tools?.listChanged || subCapabilities?.tools?.listChanged,
          },
          prompts: {
            ...acc.prompts,
            ...(subCapabilities?.prompts ?? {}),
            listChanged:
              acc.prompts?.listChanged || subCapabilities?.prompts?.listChanged,
          },
          resources: {
            ...acc.resources,
            ...(subCapabilities?.resources ?? {}),
            listChanged:
              acc.resources?.listChanged ||
              subCapabilities?.resources?.listChanged,
            subscribe:
              acc.resources?.subscribe || subCapabilities?.resources?.subscribe,
          },
        };
      }, {} as Required<ServerOptions>["capabilities"]),
      instructions:
        "This is a proxy server that connects to other servers.\n\nProxied Servers:\n\n" +
        allInstructions
          .map(
            ({ serverName, instructions }) =>
              `# ${serverName}\n${instructions ?? ""}`
          )
          .join("\n\n"),
    };

    const server = new McpServer(
      {
        name: "tool-connector",
        version: "1.0.0",
      },
      serverOptions
    );

    // request handlers
    server.server.setRequestHandler(
      CallToolRequestSchema,
      (req): Promise<CallToolResult> => {
        const internalTool = externalToolNameMap.get(req.params.name);

        if (internalTool === undefined) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Tool ${req.params.name} not found`
          );
        }

        const client = clients.get(internalTool.serverName);
        if (client === undefined) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Tool ${req.params.name} not found`
          );
        }

        return client.callTool({
          ...req.params,
          name: internalTool.toolName,
        }) as Promise<CallToolResult>;
      }
    );

    server.server.setRequestHandler(
      GetPromptRequestSchema,
      (req): Promise<GetPromptResult> => {
        const internalPrompt = externalPromptNameMap.get(req.params.name);

        if (internalPrompt === undefined) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Prompt ${req.params.name} not found`
          );
        }

        const client = clients.get(internalPrompt.serverName);

        if (client === undefined) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Prompt ${req.params.name} not found`
          );
        }

        return client.getPrompt({
          ...req.params,
          name: internalPrompt.promptName,
        });
      }
    );

    server.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (req): Promise<ReadResourceResult> => {
        const { serverName, uri: resourceUri } = unwrapUri(req.params);

        if (!serverName) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Resource ${req.params.uri} not found`
          );
        }

        const client = clients.get(serverName);

        if (client === undefined) {
          throw new McpError(
            ErrorCode.InvalidParams,
            `Resource ${req.params.uri} not found`
          );
        }

        const result = await client.readResource({
          ...req.params,
          uri: resourceUri,
        });

        result.contents = result.contents.map((content) => ({
          ...content,
          uri: wrapUriWithServer({
            serverName,
            uri: content.uri,
          }),
        }));

        return result;
      }
    );

    server.server.setRequestHandler(
      ListToolsRequestSchema,
      async (): Promise<ListToolsResult> => {
        const allTools: Tool[] = [];
        const newToolMap: typeof externalToolNameMap = new Map();

        for (const [serverName, client] of clients) {
          try {
            const { tools } = await client.listTools();

            for (const tool of tools) {
              const toolName = createUniqueName({
                serverName,
                name: tool.name,
                map: newToolMap,
              });

              if (toolName) {
                newToolMap.set(toolName, {
                  serverName,
                  toolName: tool.name,
                });

                allTools.push({
                  ...tool,
                  name: toolName,
                });
              }
            }
          } catch {
            // ignore servers that do not support listing tools
          }
        }

        externalToolNameMap = newToolMap;
        return { tools: allTools };
      }
    );

    server.server.setRequestHandler(
      ListPromptsRequestSchema,
      async (): Promise<ListPromptsResult> => {
        const allPrompts: Prompt[] = [];
        const newPromptMap: typeof externalPromptNameMap = new Map();

        for (const [serverName, client] of clients) {
          try {
            const { prompts } = await client.listPrompts();

            for (const prompt of prompts) {
              const promptName = createUniqueName({
                serverName,
                name: prompt.name,
                map: newPromptMap,
              });

              if (promptName) {
                newPromptMap.set(promptName, {
                  serverName,
                  promptName: prompt.name,
                });

                allPrompts.push({
                  ...prompt,
                  name: promptName,
                });
              }
            }
          } catch {
            // ignore servers that do not support listing prompts
          }
        }

        externalPromptNameMap = newPromptMap;
        return { prompts: allPrompts };
      }
    );

    server.server.setRequestHandler(ListResourcesRequestSchema, () =>
      handleListResources(clients)
    );

    server.server.setRequestHandler(ListResourceTemplatesRequestSchema, () =>
      handleListResourceTemplates(clients)
    );

    server.server.setRequestHandler(SubscribeRequestSchema, (req) => {
      const { serverName, uri: resourceUri } = unwrapUri(req.params);

      if (!serverName) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Resource ${req.params.uri} not found`
        );
      }

      const client = clients.get(serverName);

      if (client === undefined) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Resource ${req.params.uri} not found`
        );
      }

      // silently ignore if the server does not support subscribing to resources
      // unsure if there's a better way to handle this
      if (!client.getServerCapabilities()?.resources?.subscribe) {
        return {};
      }

      return client.subscribeResource({
        ...req.params,
        uri: resourceUri,
      });
    });

    server.server.setRequestHandler(UnsubscribeRequestSchema, (req) => {
      const { serverName, uri: resourceUri } = unwrapUri(req.params);

      if (!serverName) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Resource ${req.params.uri} not found`
        );
      }

      const client = clients.get(serverName);

      if (client === undefined) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Resource ${req.params.uri} not found`
        );
      }

      // silently ignore if the server does not support subscribing to resources
      // unsure if there's a better way to handle this
      if (!client.getServerCapabilities()?.resources?.subscribe) {
        return {};
      }

      return client.unsubscribeResource({
        ...req.params,
        uri: resourceUri,
      });
    });

    server.server.setNotificationHandler(
      RootsListChangedNotificationSchema,
      () =>
        Promise.all(
          Array.from(clients.values()).map((client) =>
            client.sendRootsListChanged().catch(() => {})
          )
        ).then(() => {})
    );

    // notifications
    for (const [serverName, client] of clients) {
      client.setNotificationHandler(
        ProgressNotificationSchema,
        (notification) => server.server.notification(notification)
      );

      client.setNotificationHandler(
        CancelledNotificationSchema,
        (notification) => server.server.notification(notification)
      );

      const subCapabilities = client.getServerCapabilities();
      if (subCapabilities?.tools?.listChanged) {
        client.setNotificationHandler(ToolListChangedNotificationSchema, () =>
          server.sendToolListChanged()
        );
      }

      if (subCapabilities?.prompts?.listChanged) {
        client.setNotificationHandler(PromptListChangedNotificationSchema, () =>
          server.sendPromptListChanged()
        );
      }

      if (subCapabilities?.resources?.listChanged) {
        client.setNotificationHandler(
          ResourceListChangedNotificationSchema,
          () => server.sendResourceListChanged()
        );
      }

      if (subCapabilities?.resources?.subscribe) {
        client.setNotificationHandler(
          ResourceUpdatedNotificationSchema,
          (notification) =>
            server.server.sendResourceUpdated({
              ...notification.params,
              uri: wrapUriWithServer({
                serverName,
                uri: notification.params.uri,
              }),
            })
        );
      }
    }

    // cleanup hooks
    server.server.onclose = () => {
      Promise.all(onCloseHooks.map((hook) => hook().catch(() => {})));
    };

    // DONE SETTING UP SERVER

    return server;
  } catch (error) {
    // Clean up any clients that were created before the error occurred
    await Promise.all(onCloseHooks.map((hook) => hook().catch(() => {})));
    throw error;
  }
}
