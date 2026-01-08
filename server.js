import "dotenv/config";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { createAgent } from "langchain";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

const client = new MultiServerMCPClient({
  //   math: {
  //     transport: "stdio", // Local subprocess communication
  //     command: "node",
  //     // Replace with absolute path to your math_server.js file
  //     args: ["./math_server.js"],
  //   },
  weather: {
    transport: "http", // HTTP-based remote server
    // Ensure you start your weather server on port 8000
    url: "http://localhost:8200/mcp",
  },
});

const model = new ChatGoogleGenerativeAI({
  model: "gemini-2.5-pro",
  temperature: 0,
  maxRetries: 2,
});

const tools = await client.getTools();
const agent = createAgent({
  model: model,
  tools,
});

// const mathResponse = await agent.invoke({
//   messages: [{ role: "user", content: "what's (3 + 5) x 12?" }],
// });

// console.log("mathResponse ", mathResponse);

const weatherResponse = await agent.invoke({
  messages: [{ role: "user", content: "what is the weather in nyc?" }],
});

console.log("weatherResponse ", weatherResponse);
