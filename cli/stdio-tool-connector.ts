#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  InitializedNotificationSchema,
  ProgressNotificationSchema,
  ResourceListChangedNotificationSchema,
  ResourceUpdatedNotificationSchema,
  PromptListChangedNotificationSchema,
  ToolListChangedNotificationSchema,
  LoggingMessageNotificationSchema,
  RootsListChangedNotificationSchema,
  PingRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const MCP_NOTIFICATION_SCHEMAS = [
  InitializedNotificationSchema,
  ProgressNotificationSchema,
  ResourceListChangedNotificationSchema,
  ResourceUpdatedNotificationSchema,
  PromptListChangedNotificationSchema,
  ToolListChangedNotificationSchema,
  LoggingMessageNotificationSchema,
  RootsListChangedNotificationSchema,
] as const;

const MCP_REQUEST_SCHEMAS = [
  PingRequestSchema,
  CallToolRequestSchema,
  // todo
] as const;

async function main(url: string) {
  // Client setup
  const client = new Client({
    name: "tool-connector-proxy",
    version: "1.0.0",
  });

  await client.connect(new StreamableHTTPClientTransport(new URL(url)));

  const capabilities = client.getServerCapabilities();
  const implementation = client.getServerVersion();
  const instructions = client.getInstructions();

  if (
    capabilities === undefined ||
    implementation === undefined ||
    instructions === undefined
  ) {
    throw new Error(
      "Failed to retrieve server capabilities or implementation version. It seems like the server failed to initialize."
    );
  }

  // Server setup
  const server = new Server(implementation, {
    capabilities,
    instructions,
  });

  client.onclose = () => server.close();

  MCP_NOTIFICATION_SCHEMAS.forEach((notificationSchema) =>
    client.setNotificationHandler(notificationSchema, server.notification)
  );

  await server.connect(new StdioServerTransport());

  console.log("MCP Wrapper Server running on stdio");
}

// Command line argument parsing
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Usage: stdio-mcp-wrapper <url>");
  process.exit(1);
}

main(args[0]).catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});
