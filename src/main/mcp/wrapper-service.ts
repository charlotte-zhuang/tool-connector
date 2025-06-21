import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import {
  CallToolRequest,
  CallToolResult,
  CompleteRequest,
  CompleteResult,
  EmptyResult,
  ErrorCode,
  GetPromptRequest,
  GetPromptResult,
  ListPromptsRequest,
  ListPromptsResult,
  ListResourcesRequest,
  ListResourcesResult,
  ListResourceTemplatesRequest,
  ListResourceTemplatesResult,
  ListToolsRequest,
  ListToolsResult,
  McpError,
  ProgressNotification,
  Prompt,
  ReadResourceRequest,
  ReadResourceResult,
  RootsListChangedNotification,
  SetLevelRequest,
  SubscribeRequest,
  Tool,
  UnsubscribeRequest,
} from "@modelcontextprotocol/sdk/types.js";
import {
  unwrapProgressToken,
  unwrapUri,
  wrapProgressTokenWithServer,
  wrapUriWithServer,
} from "./conversion";

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
  let uniqueName = `${serverName}-${name}`.substring(0, MAX_NAME_LENGTH);

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

/**
 * This service proxies requests to all the wrapped MCP servers.
 *
 * This service should only be created after a connection is established with the actual client
 * and all wrapped MCP servers are initialized.
 *
 * TODO: support cancellation
 */
export default class WrapperService {
  isClosed = false;

  private externalToolNameMap: Map<
    string,
    { serverName: string; toolName: string }
  > | null = null;

  private externalPromptNameMap: Map<
    string,
    { serverName: string; promptName: string }
  > | null = null;

  constructor(private clients: Map<string, Client>) {}

  async close(): Promise<void> {
    if (this.isClosed) {
      return;
    }

    this.isClosed = true;
    await Promise.all(
      Array.from(this.clients.values()).map((client) => client.close())
    );
  }

  async handleCallToolRequest(req: CallToolRequest): Promise<CallToolResult> {
    if (this.isClosed) {
      throw new McpError(ErrorCode.ConnectionClosed, "Client is closed");
    }

    if (this.externalToolNameMap === null) {
      const { externalToolNameMap: newToolMap } = await this.listAllTools();
      this.externalToolNameMap = newToolMap;
    }

    const internalTool = this.externalToolNameMap.get(req.params.name);

    if (internalTool === undefined) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Tool ${req.params.name} not found`
      );
    }

    const client = this.clients.get(internalTool.serverName);
    if (client === undefined) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Tool ${req.params.name} not found`
      );
    }

    const res = await client.callTool({
      ...req.params,
      name: internalTool.toolName,
      _meta:
        req.params._meta?.progressToken !== undefined
          ? {
              ...req.params._meta,
              progressToken: wrapProgressTokenWithServer({
                serverName: internalTool.serverName,
                progressToken: req.params._meta.progressToken,
              }),
            }
          : req.params._meta,
    });

    return res as CallToolResult;
  }

  private async listAllTools(): Promise<{
    tools: Tool[];
    externalToolNameMap: Map<string, { serverName: string; toolName: string }>;
  }> {
    if (this.isClosed) {
      throw new McpError(ErrorCode.ConnectionClosed, "Client is closed");
    }

    const allTools: Tool[] = [];
    const newToolMap: Map<string, { serverName: string; toolName: string }> =
      new Map();

    for (const [serverName, client] of this.clients) {
      // skip servers that do not support tools
      if (!client.getServerCapabilities()?.tools) {
        continue;
      }

      try {
        const { tools, nextCursor } = await client.listTools();

        if (nextCursor) {
          // TODO: handle pagination
          console.log(
            `Server ${serverName} paginates tools, which is not yet supported.`
          );
        }

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
      } catch (error) {
        console.error(`Failed to list tools for server ${serverName}:`, error);
      }
    }

    return { tools: allTools, externalToolNameMap: newToolMap };
  }

  async handleListToolsRequest(
    _req: ListToolsRequest
  ): Promise<ListToolsResult> {
    // TODO: support progress
    const { tools, externalToolNameMap: newToolMap } =
      await this.listAllTools();

    this.externalToolNameMap = newToolMap;

    return { tools };
  }

  async handleGetPromptRequest(
    req: GetPromptRequest
  ): Promise<GetPromptResult> {
    if (this.isClosed) {
      throw new McpError(ErrorCode.ConnectionClosed, "Client is closed");
    }

    if (this.externalPromptNameMap === null) {
      const { externalPromptNameMap: newPromptMap } =
        await this.listAllPrompts();
      this.externalPromptNameMap = newPromptMap;
    }

    const internalPrompt = this.externalPromptNameMap.get(req.params.name);

    if (internalPrompt === undefined) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Prompt ${req.params.name} not found`
      );
    }

    const client = this.clients.get(internalPrompt.serverName);

    if (client === undefined || !client.getServerCapabilities()?.prompts) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Prompt ${req.params.name} not found`
      );
    }

    return client.getPrompt({
      ...req.params,
      name: internalPrompt.promptName,
      _meta:
        req.params._meta?.progressToken !== undefined
          ? {
              ...req.params._meta,
              progressToken: wrapProgressTokenWithServer({
                serverName: internalPrompt.serverName,
                progressToken: req.params._meta.progressToken,
              }),
            }
          : req.params._meta,
    });
  }

  async listAllPrompts(): Promise<{
    prompts: Prompt[];
    externalPromptNameMap: Map<
      string,
      { serverName: string; promptName: string }
    >;
  }> {
    if (this.isClosed) {
      throw new McpError(ErrorCode.ConnectionClosed, "Client is closed");
    }

    const allPrompts: Prompt[] = [];
    const newPromptMap: Map<
      string,
      { serverName: string; promptName: string }
    > = new Map();

    for (const [serverName, client] of this.clients) {
      // skip servers that do not support prompts
      if (!client.getServerCapabilities()?.prompts) {
        continue;
      }

      try {
        const { prompts, nextCursor } = await client.listPrompts();

        if (nextCursor) {
          // TODO: handle pagination
          console.log(
            `Server ${serverName} paginates prompts, which is not yet supported.`
          );
        }

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
      } catch (error) {
        console.error(
          `Failed to list prompts for server ${serverName}:`,
          error
        );
      }
    }
    return { prompts: allPrompts, externalPromptNameMap: newPromptMap };
  }

  async handleListPromptsRequest(
    _req: ListPromptsRequest
  ): Promise<ListPromptsResult> {
    // TODO: support progress
    const { prompts, externalPromptNameMap: newPromptMap } =
      await this.listAllPrompts();

    this.externalPromptNameMap = newPromptMap;

    return { prompts };
  }

  async handleReadResourceRequest(
    req: ReadResourceRequest
  ): Promise<ReadResourceResult> {
    if (this.isClosed) {
      throw new McpError(ErrorCode.ConnectionClosed, "Client is closed");
    }

    const { serverName, uri: resourceUri } = unwrapUri(req.params);

    if (!serverName) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Resource ${req.params.uri} not found`
      );
    }

    const client = this.clients.get(serverName);

    if (client === undefined || !client.getServerCapabilities()?.resources) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Resource ${req.params.uri} not found`
      );
    }

    const result = await client.readResource({
      ...req.params,
      uri: resourceUri,
      _meta:
        req.params._meta?.progressToken !== undefined
          ? {
              ...req.params._meta,
              progressToken: wrapProgressTokenWithServer({
                serverName,
                progressToken: req.params._meta.progressToken,
              }),
            }
          : req.params._meta,
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

  async handleListResourcesRequest(
    _req: ListResourcesRequest
  ): Promise<ListResourcesResult> {
    if (this.isClosed) {
      throw new McpError(ErrorCode.ConnectionClosed, "Client is closed");
    }

    // todo: support progress

    return {
      resources: (
        await Promise.all(
          Array.from(this.clients.entries()).flatMap(
            async ([serverName, client]) => {
              // skip servers that do not support resources
              if (!client.getServerCapabilities()?.resources) {
                return [];
              }

              try {
                const { resources, nextCursor } = await client.listResources();

                if (nextCursor) {
                  // TODO: handle pagination
                  console.log(
                    `Server ${serverName} paginates resources, which is not yet supported.`
                  );
                }

                return resources.map((resource) => ({
                  ...resource,
                  uri: wrapUriWithServer({
                    serverName,
                    uri: resource.uri,
                  }),
                }));
              } catch (error) {
                console.error(
                  `Failed to list resources for server ${serverName}:`,
                  error
                );
                return [];
              }
            }
          )
        )
      ).flat(),
    };
  }

  async handleListResourceTemplatesRequest(
    _req: ListResourceTemplatesRequest
  ): Promise<ListResourceTemplatesResult> {
    if (this.isClosed) {
      throw new McpError(ErrorCode.ConnectionClosed, "Client is closed");
    }

    // todo: support progress

    return {
      resourceTemplates: (
        await Promise.all(
          Array.from(this.clients.entries()).flatMap(
            async ([serverName, client]) => {
              // skip servers that do not support resources
              if (!client.getServerCapabilities()?.resources) {
                return [];
              }

              try {
                const { resourceTemplates, nextCursor } =
                  await client.listResourceTemplates();

                if (nextCursor) {
                  // TODO: handle pagination
                  console.log(
                    `Server ${serverName} paginates resource templates, which is not yet supported.`
                  );
                }

                return resourceTemplates.map((template) => ({
                  ...template,
                  uriTemplate: wrapUriWithServer({
                    serverName,
                    uri: template.uriTemplate,
                  }),
                }));
              } catch (error) {
                console.error(
                  `Failed to list resource templates for server ${serverName}:`,
                  error
                );
                return [];
              }
            }
          )
        )
      ).flat(),
    };
  }

  async handleSubscribeRequest(req: SubscribeRequest): Promise<EmptyResult> {
    if (this.isClosed) {
      throw new McpError(ErrorCode.ConnectionClosed, "Client is closed");
    }

    const { serverName, uri: resourceUri } = unwrapUri(req.params);

    if (!serverName) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Resource ${req.params.uri} not found`
      );
    }

    const client = this.clients.get(serverName);

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
      _meta:
        req.params._meta?.progressToken !== undefined
          ? {
              ...req.params._meta,
              progressToken: wrapProgressTokenWithServer({
                serverName,
                progressToken: req.params._meta.progressToken,
              }),
            }
          : req.params._meta,
    });
  }

  async handleUnsubscribeRequest(
    req: UnsubscribeRequest
  ): Promise<EmptyResult> {
    if (this.isClosed) {
      throw new McpError(ErrorCode.ConnectionClosed, "Client is closed");
    }

    const { serverName, uri: resourceUri } = unwrapUri(req.params);

    if (!serverName) {
      throw new McpError(
        ErrorCode.InvalidParams,
        `Resource ${req.params.uri} not found`
      );
    }

    const client = this.clients.get(serverName);

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
      _meta:
        req.params._meta?.progressToken !== undefined
          ? {
              ...req.params._meta,
              progressToken: wrapProgressTokenWithServer({
                serverName,
                progressToken: req.params._meta.progressToken,
              }),
            }
          : req.params._meta,
    });
  }

  async handleSetLevelRequest(req: SetLevelRequest): Promise<EmptyResult> {
    if (this.isClosed) {
      throw new McpError(ErrorCode.ConnectionClosed, "Client is closed");
    }

    await Promise.all(
      Array.from(this.clients.entries()).map(([serverName, client]) => {
        if (!client.getServerCapabilities()?.logging) {
          return;
        }
        return client.setLoggingLevel(req.params.level).catch((error) => {
          console.error(
            `Failed to set logging level for server ${serverName}:`,
            error
          );
        });
      })
    );
    return {};
  }

  async handleCompleteRequest(req: CompleteRequest): Promise<CompleteResult> {
    if (this.isClosed) {
      throw new McpError(ErrorCode.ConnectionClosed, "Client is closed");
    }

    if (req.params.ref.type === "ref/prompt") {
      if (this.externalPromptNameMap === null) {
        const { externalPromptNameMap: newPromptMap } =
          await this.listAllPrompts();
        this.externalPromptNameMap = newPromptMap;
      }

      const internalPrompt = this.externalPromptNameMap.get(
        req.params.ref.name
      );

      if (internalPrompt === undefined) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Prompt ${req.params.ref.name} not found`
        );
      }

      const client = this.clients.get(internalPrompt.serverName);

      if (client === undefined || !client.getServerCapabilities()?.prompts) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Prompt ${req.params.ref.name} not found`
        );
      }

      return client.complete({
        ...req.params,
        _meta:
          req.params._meta?.progressToken !== undefined
            ? {
                ...req.params._meta,
                progressToken: wrapProgressTokenWithServer({
                  serverName: internalPrompt.serverName,
                  progressToken: req.params._meta.progressToken,
                }),
              }
            : req.params._meta,
      });
    } else if (req.params.ref.type === "ref/resource") {
      const { serverName, uri: resourceUri } = unwrapUri(req.params.ref);

      if (!serverName) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Resource ${req.params.ref.uri} not found`
        );
      }

      const client = this.clients.get(serverName);

      if (client === undefined || !client.getServerCapabilities()?.resources) {
        throw new McpError(
          ErrorCode.InvalidParams,
          `Resource ${req.params.ref.uri} not found`
        );
      }

      return client.complete({
        ...req.params,
        ref: {
          ...req.params.ref,
          uri: resourceUri,
        },
        _meta:
          req.params._meta?.progressToken !== undefined
            ? {
                ...req.params._meta,
                progressToken: wrapProgressTokenWithServer({
                  serverName,
                  progressToken: req.params._meta.progressToken,
                }),
              }
            : req.params._meta,
      });
    }

    req.params.ref satisfies never;
    throw new McpError(ErrorCode.InvalidParams, "Invalid reference type");
  }

  async handleRootsListChangedNotification(
    _notification: RootsListChangedNotification
  ): Promise<void> {
    if (this.isClosed) {
      return;
    }

    await Promise.all(
      Array.from(this.clients.entries()).map(([serverName, client]) => {
        if (!client.getServerCapabilities()?.resources) {
          return;
        }

        client.sendRootsListChanged().catch((error) => {
          console.error(
            `Failed to send roots list changed notification for server ${serverName}:`,
            error
          );
        });
      })
    );
  }

  async handleProgressNotification(
    notification: ProgressNotification
  ): Promise<void> {
    if (this.isClosed) {
      return;
    }

    const { serverName, progressToken } = unwrapProgressToken({
      progressToken: notification.params.progressToken,
    });

    // ok to ignore
    if (!serverName) {
      return;
    }

    const client = this.clients.get(serverName);

    // ok to ignore
    if (client === undefined) {
      return;
    }

    client.notification({
      ...notification,
      params: notification.params
        ? {
            ...notification.params,
            progressToken: wrapProgressTokenWithServer({
              serverName,
              progressToken,
            }),
          }
        : notification.params,
    });
  }
}
