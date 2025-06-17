import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";

export default function createMcpServer() {
  const server = new McpServer({
    name: "Echo",
    version: "1.0.0",
  });

  server.registerTool(
    "echo",
    {
      description: "Echoes back the input",
      inputSchema: {
        message: z.string().describe("Message to echo"),
      },
    },
    (args) => {
      const validatedArgs = args;
      return {
        content: [{ type: "text", text: `Echo: ${validatedArgs.message}` }],
      };
    }
  );

  return server;
}
