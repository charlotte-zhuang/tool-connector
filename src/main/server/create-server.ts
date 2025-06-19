import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";
import {
  getConfigsFromStore,
  setConfigsInStore,
  type AppStore,
} from "@/main/store";
import { createMcpServer } from "@/main/mcp";
import { Configs } from "@/shared/schemas";

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

    let configs: Configs;
    try {
      configs = getConfigsFromStore(store);
    } catch {
      res.writeHead(500).end(
        JSON.stringify({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Failed to retrieve configs",
          },
          id: null,
        })
      );
      return;
    }

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
  const server = app.listen(getConfigsFromStore(store).port ?? 0, () => {
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

    try {
      const configs = getConfigsFromStore(store);
      configs.port = port;
      setConfigsInStore(store, configs);
    } catch {
      console.error("Failed to save port to configs");
    }

    console.log(`Tool connector listening on port ${port}`);
  });

  return () => {
    server.close(() => {
      console.log("Tool connector closed");
    });
  };
}
