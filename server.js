import { randomUUID } from "node:crypto";
import { z } from "zod";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { isInitializeRequest } from "@modelcontextprotocol/sdk/types.js";
import { getFarmSummary } from "./farmData.js";

/**
 * Function-based MCP server setup (no classes)
 * Creates and configures the MCP server with tools
 */
function createMcpServer() {
  const server = new McpServer({
    name: "farm-os-mcp-server",
    version: "0.1.0",
    capabilities: {
      tools: {},
    },
  });

  // Register tool using registerTool (not .tool())
  // Tool is dispatched when called
  server.registerTool(
    "get_farm_summary",
    {
      description: "Return a simple summary of Farm OS data (test data only).",
      inputSchema: {
        // Optional parameter for testing
        fieldId: z
          .string()
          .optional()
          .describe("Optional field ID to filter data (e.g., 'field-1')"),
      },
    },
    async ({ fieldId }) => {
      const summary = getFarmSummary();

      // If fieldId is provided, filter to that field
      let result = summary;
      if (fieldId) {
        const field = summary.fields.find((f) => f.id === fieldId);
        if (field) {
          result = {
            farmName: summary.farmName,
            location: summary.location,
            field: field,
            updatedAt: summary.updatedAt,
          };
        } else {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  { error: `Field ${fieldId} not found` },
                  null,
                  2
                ),
              },
            ],
          };
        }
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }
  );

  return server;
}

/**
 * Start the HTTP MCP server with URL transport
 */
function startHttpMcpServer(port = 3100) {
  const app = createMcpExpressApp();
  const transports = {};

  // POST endpoint for MCP requests
  app.post("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"];

    try {
      let transport;

      if (sessionId && transports[sessionId]) {
        // Reuse existing transport for this session
        transport = transports[sessionId];
      } else if (!sessionId && isInitializeRequest(req.body)) {
        // New initialization request - create new transport
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (sid) => {
            console.log(`Session initialized with ID: ${sid}`);
            transports[sid] = transport;
          },
        });

        // Clean up transport when closed
        transport.onclose = () => {
          const sid = transport.sessionId;
          if (sid && transports[sid]) {
            console.log(
              `Transport closed for session ${sid}, removing from transports map`
            );
            delete transports[sid];
          }
        };

        // Connect the transport to the MCP server
        const server = createMcpServer();
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
        return; // Already handled
      } else {
        // Invalid request
        res.status(400).json({
          jsonrpc: "2.0",
          error: {
            code: -32000,
            message: "Bad Request: No valid session ID provided",
          },
          id: null,
        });
        return;
      }

      // Handle request with existing transport
      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("Error handling MCP request:", error);
      if (!res.headersSent) {
        res.status(500).json({
          jsonrpc: "2.0",
          error: {
            code: -32603,
            message: "Internal server error",
          },
          id: null,
        });
      }
    }
  });

  // GET endpoint for SSE streams
  app.get("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"];
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }

    console.log(`Establishing SSE stream for session ${sessionId}`);
    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  });

  // DELETE endpoint for session termination
  app.delete("/mcp", async (req, res) => {
    const sessionId = req.headers["mcp-session-id"];
    if (!sessionId || !transports[sessionId]) {
      res.status(400).send("Invalid or missing session ID");
      return;
    }

    console.log(
      `Received session termination request for session ${sessionId}`
    );
    try {
      const transport = transports[sessionId];
      await transport.handleRequest(req, res);
    } catch (error) {
      console.error("Error handling session termination:", error);
      if (!res.headersSent) {
        res.status(500).send("Error processing session termination");
      }
    }
  });

  // Start the server
  app.listen(port, (error) => {
    if (error) {
      console.error("Failed to start server:", error);
      process.exit(1);
    }
    console.log(`MCP HTTP Server listening on http://localhost:${port}/mcp`);
  });

  // Cleanup on shutdown
  process.on("SIGINT", async () => {
    console.log("Shutting down server...");
    for (const sessionId in transports) {
      try {
        console.log(`Closing transport for session ${sessionId}`);
        await transports[sessionId].close();
        delete transports[sessionId];
      } catch (error) {
        console.error(
          `Error closing transport for session ${sessionId}:`,
          error
        );
      }
    }
    console.log("Server shutdown complete");
    process.exit(0);
  });
}

// Start the server
startHttpMcpServer(3100);
