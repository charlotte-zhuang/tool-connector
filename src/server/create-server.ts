import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";
import type { AppStore } from "../store";
import { createMcpServer } from "../mcp";

/**
 * @returns cleanup function
 */
export default function createServer({
  store,
}: {
  store: AppStore;
}): () => void {
  const app = express();

  app.use(express.json());

  app.post("/mcp", async (req: Request, res: Response) => {
    // In stateless mode, create a new instance of transport and server for each request
    // to ensure complete isolation. A single instance would cause request ID collisions
    // when multiple clients connect concurrently.

    const configs = store.get("configs");
    const mcpServer = createMcpServer({ configs });

    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });

    res.on("close", () => {
      transport.close();
      mcpServer.close();
    });
    await mcpServer.connect(transport);
    await transport.handleRequest(req, res, req.body);
  });

  app.get("/mcp", async (_req: Request, res: Response) => {
    res.writeHead(405).end(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Method not allowed.",
        },
        id: null,
      })
    );
  });

  app.delete("/mcp", async (_req: Request, res: Response) => {
    res.writeHead(405).end(
      JSON.stringify({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Method not allowed.",
        },
        id: null,
      })
    );
  });

  // Start the express server
  const server = app.listen(store.get("configs.port", 0), () => {
    const address = server.address();

    if (typeof address !== "object") {
      console.error("Failed to retrieve server address.");
      return;
    }

    const { port } = address ?? {};

    if (typeof port !== "number") {
      console.error("Failed to retrieve server port.");
      return;
    }

    store.set("configs.port", port);
    console.log(`Tool connector listening on port ${port}`);
  });

  return () => {
    server.close(() => {
      console.log("Tool connector closed");
    });
  };
}
