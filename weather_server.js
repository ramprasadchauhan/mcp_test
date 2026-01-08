// import { Server } from "@modelcontextprotocol/sdk/server/index.js";
// import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
// import {
//   CallToolRequestSchema,
//   ListToolsRequestSchema,
// } from "@modelcontextprotocol/sdk/types.js";
// import express from "express";

// const app = express();
// app.use(express.json());

// const server = new Server(
//   {
//     name: "weather-server",
//     version: "0.1.0",
//   },
//   {
//     capabilities: {
//       tools: {},
//     },
//   }
// );

// server.setRequestHandler(ListToolsRequestSchema, async () => {
//   return {
//     tools: [
//       {
//         name: "get_weather",
//         description: "Get weather for location",
//         inputSchema: {
//           type: "object",
//           properties: {
//             location: {
//               type: "string",
//               description: "Location to get weather for",
//             },
//           },
//           required: ["location"],
//         },
//       },
//     ],
//   };
// });

// server.setRequestHandler(CallToolRequestSchema, async (request) => {
//   switch (request.params.name) {
//     case "get_weather": {
//       const { location } = request.params.arguments;
//       return {
//         content: [
//           {
//             type: "text",
//             text: `It's always sunny in ${location}`,
//           },
//         ],
//       };
//     }
//     default:
//       throw new Error(`Unknown tool: ${request.params.name}`);
//   }
// });

// app.post("/mcp", async (req, res) => {
//   const transport = new SSEServerTransport("/mcp", res);
//   await server.connect(transport);
// });

// const PORT = process.env.PORT || 8000;
// app.listen(PORT, () => {
//   console.log(`Weather MCP server running on port ${PORT}`);
// });

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import express from "express";

const app = express();

const server = new McpServer({
  name: "weather-server",
  version: "1.0.0",
});

// --- Define your tools as you did before ---
server.registerTool(
  "get_weather",
  {
    description: "Get current weather for a location",
    inputSchema: {
      location: z.string().describe("The city or location name"),
    },
  },
  async ({ location }) => {
    return {
      content: [
        {
          type: "text",
          text: `It's currently 72°F and sunny in ${location}`,
        },
      ],
    };
  }
);
// --- FIX STARTS HERE ---
// let transport;

// // 1. SSE Setup Endpoint (Client connects here first)
// app.get("/mcp", async (req, res) => {
//   console.log("Client connecting via SSE...");
//   transport = new SSEServerTransport("/messages", res); // Messages will be sent to /messages
//   await server.connect(transport);
// });

// // 2. Message Handling Endpoint (Client sends commands here)
// app.post("/messages", async (req, res) => {
//   console.log("Received message from client");
//   if (transport) {
//     await transport.handlePostMessage(req, res);
//   } else {
//     res.status(400).send("No active session");
//   }
// });

app.post("/mcp", async (req, res) => {
  const transport = new SSEServerTransport("/mcp", res);
  await server.connect(transport);
});

const PORT = 8000;
app.listen(PORT, () => {
  console.log(`Weather MCP server running on port ${PORT}`);
});
