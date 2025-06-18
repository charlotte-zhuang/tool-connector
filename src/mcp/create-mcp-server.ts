import { Configs } from "@/configs";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import z from "zod";

export default function createMcpServer({}: { configs: Configs }) {
  const server = new McpServer({
    name: "tool-connector",
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
