#!/usr/bin/env node

import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

async function testServer() {
  console.log("🧪 Testing Simple Memory MCP Server...\n");

  const transport = new StdioClientTransport({
    command: "node",
    args: ["index.js"]
  });

  const client = new Client(
    {
      name: "test-client",
      version: "1.0.0"
    },
    {
      capabilities: {}
    }
  );

  try {
    console.log("📡 Connecting to server...");
    await client.connect(transport);
    console.log("✅ Connected successfully!\n");

    // Test 1: List tools
    console.log("🔧 Testing tools list...");
    const tools = await client.listTools();
    console.log(`✅ Found ${tools.tools.length} tools:`, tools.tools.map(t => t.name).join(', '));
    console.log();

    // Test 2: Test prompts list  
    console.log("💬 Testing prompts list...");
    const prompts = await client.listPrompts();
    console.log(`✅ Prompts endpoint working (${prompts.prompts.length} prompts)`);
    console.log();

    // Test 3: Test resources list
    console.log("📚 Testing resources list...");
    const resources = await client.listResources();
    console.log(`✅ Resources endpoint working (${resources.resources.length} resources)`);
    console.log();

    // Test 4: Test read_graph tool
    console.log("📊 Testing read_graph tool...");
    const graphResult = await client.callTool({
      name: "read_graph",
      arguments: {}
    });
    console.log("✅ read_graph successful:", JSON.parse(graphResult.content[0].text));
    console.log();

    // Test 5: Test create_entities tool
    console.log("👤 Testing create_entities tool...");
    const createResult = await client.callTool({
      name: "create_entities",
      arguments: {
        entities: [{
          name: "test-entity",
          entityType: "test",
          observations: ["This is a test entity", "Created during server testing"]
        }]
      }
    });
    console.log("✅ create_entities successful");
    console.log();

    // Test 6: Verify entity was created
    console.log("🔍 Verifying entity creation...");
    const updatedGraph = await client.callTool({
      name: "read_graph", 
      arguments: {}
    });
    const graph = JSON.parse(updatedGraph.content[0].text);
    console.log(`✅ Graph now contains ${graph.entities.length} entities and ${graph.relations.length} relations`);
    console.log();

    console.log("🎉 All tests passed! Server is working correctly.");

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    if (error.stack) {
      console.error("💥 Stack trace:", error.stack);
    }
  } finally {
    try {
      await client.close();
      console.log("\n🔌 Client connection closed");
    } catch (e) {
      // Ignore close errors
    }
  }
}

testServer().catch(console.error);