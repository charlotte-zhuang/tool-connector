import { Configs } from "@/shared/schemas";
import { G } from "@mobily/ts-belt";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import {
  getDefaultEnvironment,
  StdioClientTransport,
} from "@modelcontextprotocol/sdk/client/stdio.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  CallToolRequestSchema,
  CallToolResult,
  CompleteRequestSchema,
  CompleteResult,
  CreateMessageRequestSchema,
  CreateMessageResult,
  EmptyResult,
  ErrorCode,
  GetPromptRequestSchema,
  GetPromptResult,
  ListPromptsRequestSchema,
  ListPromptsResult,
  ListResourcesRequestSchema,
  ListResourcesResult,
  ListResourceTemplatesRequestSchema,
  ListResourceTemplatesResult,
  ListRootsRequestSchema,
  ListRootsResult,
  ListToolsRequestSchema,
  ListToolsResult,
  McpError,
  ProgressNotificationSchema,
  PromptListChangedNotificationSchema,
  ReadResourceRequestSchema,
  ReadResourceResult,
  ResourceListChangedNotificationSchema,
  ResourceUpdatedNotificationSchema,
  RootsListChangedNotificationSchema,
  SetLevelRequestSchema,
  SubscribeRequestSchema,
  ToolListChangedNotificationSchema,
  UnsubscribeRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { unwrapProgressToken, wrapUriWithServer } from "./conversion";
import WrapperService from "./wrapper-service";

export default async function createWrapperMcpServer({
  configs,
}: {
  configs: Configs["mcp_servers"];
}): Promise<McpServer> {
  // null until ALL clients are initialized
  let service: WrapperService | null = null;

  // used to keep track of functions that need to be called after clients are initialized
  const postInitHooks: ((ensuredService: WrapperService) => Promise<void>)[] =
    [];
  let postInitHooksCalled = false;

  const cleanupOnErrorHooks: (() => Promise<void>)[] = [];

  try {
    // SETUP WRAPPER SERVER
    const server = new McpServer(
      {
        name: "tool-connector",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {
            listChanged: true,
          },
          prompts: {
            listChanged: true,
          },
          resources: {
            listChanged: true,
            subscribe: true,
          },
          completions: {},
          logging: {},
        },
        instructions:
          "This is a proxy server that connects to other servers.\nProxied Servers:\n" +
          (configs ?? []).map((config) => config.name).join("\n"),
      }
    );
    cleanupOnErrorHooks.push(() => server.close());

    // WRAPPER SERVER REQUEST HANDLERS
    // these are handlers for requests from the actual client to a wrapped MCP server
    // i.e. from server to client since everything is reversed for us
    server.server.setRequestHandler(
      CallToolRequestSchema,
      (req): Promise<CallToolResult> => {
        if (service === null) {
          return new Promise((resolve, reject) => {
            postInitHooks.push((s) =>
              s.handleCallToolRequest(req).then(resolve).catch(reject)
            );
          });
        } else {
          return service.handleCallToolRequest(req);
        }
      }
    );

    server.server.setRequestHandler(
      ListToolsRequestSchema,
      async (req): Promise<ListToolsResult> => {
        if (service === null) {
          return new Promise((resolve, reject) => {
            postInitHooks.push((s) =>
              s.handleListToolsRequest(req).then(resolve).catch(reject)
            );
          });
        } else {
          return service.handleListToolsRequest(req);
        }
      }
    );

    server.server.setRequestHandler(
      GetPromptRequestSchema,
      (req): Promise<GetPromptResult> => {
        if (service === null) {
          return new Promise((resolve, reject) => {
            postInitHooks.push((s) =>
              s.handleGetPromptRequest(req).then(resolve).catch(reject)
            );
          });
        } else {
          return service.handleGetPromptRequest(req);
        }
      }
    );

    server.server.setRequestHandler(
      ListPromptsRequestSchema,
      async (req): Promise<ListPromptsResult> => {
        if (service === null) {
          return new Promise((resolve, reject) => {
            postInitHooks.push((s) =>
              s.handleListPromptsRequest(req).then(resolve).catch(reject)
            );
          });
        } else {
          return service.handleListPromptsRequest(req);
        }
      }
    );

    // resource capabilities
    server.server.setRequestHandler(
      ReadResourceRequestSchema,
      async (req): Promise<ReadResourceResult> => {
        if (service === null) {
          return new Promise((resolve, reject) => {
            postInitHooks.push((s) =>
              s.handleReadResourceRequest(req).then(resolve).catch(reject)
            );
          });
        }
        return service.handleReadResourceRequest(req);
      }
    );

    server.server.setRequestHandler(
      ListResourcesRequestSchema,
      (req): Promise<ListResourcesResult> => {
        if (service === null) {
          return new Promise((resolve, reject) => {
            postInitHooks.push((s) =>
              s.handleListResourcesRequest(req).then(resolve).catch(reject)
            );
          });
        } else {
          return service.handleListResourcesRequest(req);
        }
      }
    );

    server.server.setRequestHandler(
      ListResourceTemplatesRequestSchema,
      (req): Promise<ListResourceTemplatesResult> => {
        if (service === null) {
          return new Promise((resolve, reject) => {
            postInitHooks.push((s) =>
              s
                .handleListResourceTemplatesRequest(req)
                .then(resolve)
                .catch(reject)
            );
          });
        } else {
          return service.handleListResourceTemplatesRequest(req);
        }
      }
    );

    server.server.setRequestHandler(
      SubscribeRequestSchema,
      (req): Promise<EmptyResult> => {
        if (service === null) {
          return new Promise((resolve, reject) => {
            postInitHooks.push((s) =>
              s.handleSubscribeRequest(req).then(resolve).catch(reject)
            );
          });
        }
        return service.handleSubscribeRequest(req);
      }
    );

    server.server.setRequestHandler(
      UnsubscribeRequestSchema,
      (req): Promise<EmptyResult> | EmptyResult => {
        if (service === null) {
          return new Promise((resolve, reject) => {
            postInitHooks.push((s) =>
              s.handleUnsubscribeRequest(req).then(resolve).catch(reject)
            );
          });
        }
        return service.handleUnsubscribeRequest(req);
      }
    );

    // logging capabilities
    server.server.setRequestHandler(
      SetLevelRequestSchema,
      (req): Promise<EmptyResult> => {
        if (service === null) {
          return new Promise((resolve, reject) => {
            postInitHooks.push((s) =>
              s.handleSetLevelRequest(req).then(resolve).catch(reject)
            );
          });
        } else {
          return service.handleSetLevelRequest(req);
        }
      }
    );

    // completions
    server.server.setRequestHandler(
      CompleteRequestSchema,
      (req): Promise<CompleteResult> => {
        if (service === null) {
          return new Promise((resolve, reject) => {
            postInitHooks.push((s) =>
              s.handleCompleteRequest(req).then(resolve).catch(reject)
            );
          });
        } else {
          return service.handleCompleteRequest(req);
        }
      }
    );
    // END WRAPPER SERVER REQUEST HANDLERS

    server.server.setNotificationHandler(
      ProgressNotificationSchema,
      (notification) => {
        if (service === null) {
          return new Promise((resolve, reject) => {
            postInitHooks.push((s) =>
              s
                .handleProgressNotification(notification)
                .then(resolve)
                .catch(reject)
            );
          });
        } else {
          return service.handleProgressNotification(notification);
        }
      }
    );
    // END WRAPPER SERVER NOTIFICATION HANDLERS

    // WRAPPER SERVER POST-INITIALIZATION
    const defaultEnv = getDefaultEnvironment();
    server.server.oninitialized = async () => {
      // we need to wait until after the wrapper server connects to the actual client
      // to properly advertize capabilities and prevent requests from coming too soon

      const clientCapabilities = server.server.getClientCapabilities();
      const clientVersion = server.server.getClientVersion();

      const clients = new Map(
        (
          await Promise.all(
            (configs ?? [])
              .map(async (serverConfig): Promise<[string, Client]> => {
                let client = new Client(
                  clientVersion ?? {
                    name: "tool-connector",
                    version: "1.0.0",
                  },
                  {
                    capabilities: {
                      roots: clientCapabilities?.roots
                        ? {
                            listChanged: clientCapabilities.roots.listChanged,
                          }
                        : undefined,
                      sampling: clientCapabilities?.sampling ? {} : undefined,
                    },
                  }
                );

                if (serverConfig.kind === "command") {
                  cleanupOnErrorHooks.push(() => client.close());

                  const transport = new StdioClientTransport({
                    command: serverConfig.command,
                    args: serverConfig.args,
                    env: {
                      ...defaultEnv,
                      ...serverConfig.env,
                    },
                  });
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
                    transport = new SSEClientTransport(
                      new URL(serverConfig.url),
                      {
                        requestInit: {
                          headers: serverConfig.headers,
                        },
                      }
                    );

                    client = new Client(
                      clientVersion ?? {
                        name: "tool-connector",
                        version: "1.0.0",
                      },
                      {
                        capabilities: {
                          roots: clientCapabilities?.roots
                            ? {
                                listChanged:
                                  clientCapabilities.roots.listChanged,
                              }
                            : undefined,
                          sampling: clientCapabilities?.sampling
                            ? {}
                            : undefined,
                        },
                      }
                    );

                    await client.connect(transport);
                  } finally {
                    cleanupOnErrorHooks.push(() => client.close());
                  }
                }

                return [serverConfig.name, client];
              })
              .map((promise, index) =>
                promise.catch((error) => {
                  console.error(
                    `Failed to connect to an MCP server [${
                      configs?.[index]?.name ?? "unknown"
                    }]: ${error}`
                  );

                  // skip servers that don't work
                  return null;
                })
              )
          )
        ).filter(G.isNotNullable)
      );

      // WRAPPED SERVER HANDLERS
      // these are handlers for requests and notifications from the wrapped MCP servers to the actual client
      // i.e. from client to server since everything is reversed for us
      for (const [serverName, client] of clients) {
        // wrapped MCP server to actual client notifications
        const subCapabilities = client.getServerCapabilities();

        client.setNotificationHandler(
          ProgressNotificationSchema,
          (notification) =>
            server.server.notification({
              ...notification,
              params: notification.params
                ? {
                    ...notification.params,
                    progressToken: unwrapProgressToken({
                      progressToken: notification.params.progressToken,
                    }).progressToken,
                  }
                : notification.params,
            })
        );

        if (subCapabilities?.tools?.listChanged) {
          client.setNotificationHandler(ToolListChangedNotificationSchema, () =>
            server.sendToolListChanged()
          );
        }

        if (subCapabilities?.prompts?.listChanged) {
          client.setNotificationHandler(
            PromptListChangedNotificationSchema,
            () => server.sendPromptListChanged()
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

        // wrapped MCP server to actual client requests
        if (clientCapabilities?.sampling) {
          client.setRequestHandler(
            CreateMessageRequestSchema,
            (req): Promise<CreateMessageResult> => {
              if (!server.isConnected()) {
                throw new McpError(
                  ErrorCode.ConnectionClosed,
                  "Client is not connected"
                );
              }

              return server.server.createMessage(req.params);
            }
          );
        }

        if (clientCapabilities?.roots) {
          client.setRequestHandler(
            ListRootsRequestSchema,
            async (req): Promise<ListRootsResult> => {
              if (!server.isConnected()) {
                throw new McpError(
                  ErrorCode.ConnectionClosed,
                  "Client is not connected"
                );
              }

              const roots = await server.server.listRoots(req.params);

              // wrap URIs with server name
              return {
                roots: roots.roots.map((root) => ({
                  ...root,
                  uri: wrapUriWithServer({
                    serverName,
                    uri: root.uri,
                  }),
                })),
              };
            }
          );
        }
      }

      const ensuredService = new WrapperService(clients);

      cleanupOnErrorHooks.push(() => ensuredService.close());

      service = ensuredService;

      // POST INIT WRAPPER SERVER HANDLERS
      // these handlers are only set post-init
      if (clientCapabilities?.roots?.listChanged) {
        server.server.setNotificationHandler(
          RootsListChangedNotificationSchema,
          (notification) =>
            ensuredService.handleRootsListChangedNotification(notification)
        );
      }
      // END POST INIT WRAPPER SERVER HANDLERS

      if (!postInitHooksCalled) {
        postInitHooksCalled = true;
        await Promise.all(
          postInitHooks.map((hook) => hook(ensuredService).catch(() => {}))
        );
      }
      // END WRAPPED SERVER HANDLERS
    };
    // END WRAPPER SERVER POST-INITIALIZATION

    // cleanup hooks
    server.server.onclose = () => {
      service?.close();
    };

    // DONE SETTING UP WRAPPER SERVER

    return server;
  } catch (error) {
    // Clean up any clients that were created before the error occurred
    await Promise.all(
      cleanupOnErrorHooks.map((hook) => hook().catch(() => {}))
    );
    throw error;
  }
}
