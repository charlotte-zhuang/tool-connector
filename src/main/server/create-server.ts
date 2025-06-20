import { createWrapperMcpServer } from "@/main/mcp";
import {
  getConfigsFromStore,
  setConfigsInStore,
  type AppStore,
} from "@/main/store";
import { Configs } from "@/shared/schemas";
import { InMemoryEventStore } from "@modelcontextprotocol/sdk/examples/shared/inMemoryEventStore.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express, { Request, Response } from "express";
import { randomUUID } from "node:crypto";

/**
 * @returns cleanup function
 */
export default function createServer({
  store,
}: {
  store: AppStore;
}): () => void {
  const app = express();

  const transports: Map<string, StreamableHTTPServerTransport> = new Map<
    string,
    StreamableHTTPServerTransport
  >();

  app.post("/mcp", async (req: Request, res: Response) => {
    let configs: Configs;
    try {
      configs = getConfigsFromStore(store);
    } catch {
      res.status(500).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Failed to retrieve configs",
        },
        id: null,
      });
      return;
    }
    // Check for existing session ID
    const sessionId = req.headers["mcp-session-id"];
    let transport: StreamableHTTPServerTransport;

    if (typeof sessionId === "string" && transports.has(sessionId)) {
      // Reuse existing transport
      transport = transports.get(sessionId)!;
    } else if (!sessionId) {
      const wrapperMcpServer = await createWrapperMcpServer({
        configs: configs.mcp_servers,
      });

      // New initialization request
      const eventStore = new InMemoryEventStore();
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        eventStore, // Enable resumability
        onsessioninitialized: (sessionId: string) => {
          // Store the transport by session ID when session is initialized
          // This avoids race conditions where requests might come in before the session is stored
          transports.set(sessionId, transport);
        },
      });

      // Set up onclose handler to clean up transport when closed
      const originalServerOnClose = wrapperMcpServer.server.onclose;
      wrapperMcpServer.server.onclose = () => {
        originalServerOnClose?.();
        const sid = transport.sessionId;
        if (sid) {
          transports.delete(sid);
        }
      };

      // Connect the transport to the MCP server BEFORE handling the request
      // so responses can flow back through the same transport
      await wrapperMcpServer.connect(transport);
    } else {
      // Invalid request - no session ID or not initialization request
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: No valid session ID provided",
        },
        id: req?.body?.id,
      });
      return;
    }

    await transport.handleRequest(req, res);
  });

  app.get("/mcp", async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"];
    if (typeof sessionId !== "string") {
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: No valid session ID provided",
        },
        id: req?.body?.id,
      });
      return;
    }

    const transport = transports.get(sessionId);

    if (!transport) {
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: No valid session ID provided",
        },
        id: req?.body?.id,
      });
      return;
    }

    await transport.handleRequest(req, res);
  });

  app.delete("/mcp", async (req: Request, res: Response) => {
    const sessionId = req.headers["mcp-session-id"];
    if (typeof sessionId !== "string") {
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: No valid session ID provided",
        },
        id: req?.body?.id,
      });
      return;
    }

    const transport = transports.get(sessionId);
    if (!transport) {
      res.status(400).json({
        jsonrpc: "2.0",
        error: {
          code: -32000,
          message: "Bad Request: No valid session ID provided",
        },
        id: req?.body?.id,
      });
      return;
    }

    try {
      await transport.handleRequest(req, res);
    } catch (error) {
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Error handling session termination",
          },
          id: req?.body?.id,
        });
        return;
      }
    }
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
    // Close all active transports to properly clean up resources
    void Promise.all(
      transports.values().map((transport) => transport.close().catch(() => {}))
    );

    server.close(() => {
      console.log("Tool connector closed");
    });
  };
}
