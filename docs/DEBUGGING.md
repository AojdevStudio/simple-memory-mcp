# Debugging Guide - Simple Memory MCP Server

This guide provides comprehensive debugging procedures, common issues, and troubleshooting steps for the Simple Memory MCP Server.

## 🔍 Quick Diagnostics

### Health Check Script

Run the comprehensive test to verify server functionality:

```bash
node test-server.js
```

**Expected Output:**
```
🧪 Testing Simple Memory MCP Server...
✅ Connected successfully!
✅ Found 9 tools: create_entities, create_relations, add_observations, delete_entities, delete_observations, delete_relations, read_graph, search_nodes, open_nodes
✅ Prompts endpoint working (0 prompts)
✅ Resources endpoint working (0 resources)
✅ read_graph successful: { entities: [], relations: [] }
✅ create_entities successful
✅ Graph now contains 1 entities and 0 relations
🎉 All tests passed! Server is working correctly.
```

### MCP Inspector Testing

1. **Start Inspector:**
   ```bash
   npx @modelcontextprotocol/inspector
   ```

2. **Configure Connection:**
   - Command: `node`
   - Args: `/path/to/simple-memory-mcp/index.js`
   - Working Directory: `/path/to/simple-memory-mcp`

3. **Verify Connection:**
   - Should show "Connected" status
   - All 9 tools should be listed
   - No error messages in console

## 🚨 Common Issues & Solutions

### 1. Server Startup Issues

#### Issue: `Cannot read properties of undefined (reading 'method')`

**Root Cause:** Incorrect MCP SDK request handler syntax.

**Solution:**
```javascript
// ❌ Wrong
server.setRequestHandler("tools/list", async () => {

// ✅ Correct
server.setRequestHandler(ListToolsRequestSchema, async () => {
```

**Verification:**
```bash
node -c index.js  # Should pass syntax check
```

#### Issue: `Server does not support prompts (required for prompts/list)`

**Root Cause:** Missing capability declarations.

**Solution:**
```javascript
const server = new Server(
  { name: 'simple-memory-mcp', version: '1.1.0' },
  {
    capabilities: {
      tools: {},
      prompts: {},    // ← Add this
      resources: {}   // ← Add this
    }
  }
);
```

#### Issue: `MODULE_TYPELESS_PACKAGE_JSON` Warning

**Root Cause:** Missing module type in package.json.

**Solution:**
```json
{
  "name": "simple-memory-mcp",
  "version": "1.1.0",
  "type": "module",  // ← Add this
  "main": "index.js"
}
```

### 2. Connection Issues

#### Issue: MCP Inspector Won't Connect

**Debugging Steps:**

1. **Check Server Startup:**
   ```bash
   node index.js
   # Should output: "Simple Memory MCP Server running and ready!"
   ```

2. **Verify Path Configuration:**
   ```bash
   # Ensure absolute path is used
   which node  # Use this path in Inspector
   pwd         # Use this + "/index.js" for args
   ```

3. **Check Process:**
   ```bash
   ps aux | grep "node.*index.js"
   ```

#### Issue: Client Connection Errors

**Common Error:** `TypeError: Cannot read properties of undefined (reading 'capabilities')`

**Solution:**
```javascript
const client = new Client(
  { name: "client", version: "1.0.0" },
  { capabilities: {} }  // ← Required second parameter
);
```

### 3. Tool Execution Issues

#### Issue: "Unknown tool" Error

**Debugging:**

1. **Check Tool Registration:**
   ```javascript
   // Verify tool name matches exactly
   server.setRequestHandler(CallToolRequestSchema, async (request) => {
     const { name, arguments: args } = request.params;
     console.error(`Tool called: ${name}`);  // Debug log
   });
   ```

2. **Verify Tools List:**
   ```bash
   # Test with simple client
   echo '{"method":"tools/list","params":{},"jsonrpc":"2.0","id":1}' | node index.js
   ```

#### Issue: Tool Throws Errors

**Enable Debug Logging:**
```javascript
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    console.error(`Executing tool: ${name} with args:`, JSON.stringify(args, null, 2));
    
    switch (name) {
      case "create_entities":
        const result = memoryServer.createEntities(args.entities);
        console.error(`Tool result:`, JSON.stringify(result, null, 2));
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      // ... other cases
    }
  } catch (error) {
    console.error(`Tool ${name} failed:`, error.message);
    console.error(`Stack trace:`, error.stack);
    throw error;
  }
});
```

### 4. Memory Persistence Issues

#### Issue: Memory Not Persisting

**Check File Permissions:**
```bash
# Default location
ls -la ~/.cursor/memory.json

# Custom location (if MEMORY_PATH is set)
echo $MEMORY_PATH
ls -la "$MEMORY_PATH/memory.json"
```

**Fix Permissions:**
```bash
mkdir -p ~/.cursor
chmod 755 ~/.cursor
touch ~/.cursor/memory.json
chmod 644 ~/.cursor/memory.json
```

#### Issue: Corrupted Memory File

**Recovery Steps:**

1. **Backup Current File:**
   ```bash
   cp ~/.cursor/memory.json ~/.cursor/memory.json.backup
   ```

2. **Validate JSON:**
   ```bash
   node -e "console.log(JSON.parse(require('fs').readFileSync(process.env.HOME + '/.cursor/memory.json', 'utf8')))"
   ```

3. **Reset if Corrupted:**
   ```bash
   rm ~/.cursor/memory.json
   # Server will create fresh file on next run
   ```

#### Issue: Memory File Location

**Debug Current Path:**
```javascript
// Add to server startup
console.error(`Memory path: ${MEMORY_PATH}`);
console.error(`Resolved path: ${path.resolve(MEMORY_PATH)}`);
console.error(`Directory exists: ${fs.existsSync(path.dirname(MEMORY_PATH))}`);
```

### 5. Performance Issues

#### Issue: Slow Search Operations

**Debug Search Performance:**
```javascript
searchNodes(query) {
  const startTime = Date.now();
  const results = [];
  
  this.entities.forEach(entity => {
    const searchText = `${entity.name} ${entity.entityType} ${entity.observations.join(' ')}`.toLowerCase();
    if (searchText.includes(query.toLowerCase())) {
      results.push(entity);
    }
  });
  
  const duration = Date.now() - startTime;
  console.error(`Search for "${query}" took ${duration}ms, found ${results.length} results`);
  return results;
}
```

#### Issue: Large Memory Files

**Monitor File Size:**
```bash
ls -lh ~/.cursor/memory.json
```

**Performance Recommendations:**
- Files > 10MB: Consider pagination
- Files > 100MB: Implement database backend
- > 50,000 entities: Add indexing

## 🔧 Advanced Debugging

### Enable Detailed Logging

**Add to SimpleMemoryServer constructor:**
```javascript
constructor() {
  this.debug = process.env.DEBUG === 'true';
  this.entities = new Map();
  this.relations = [];
  this.loadMemory();
}

log(message, data = null) {
  if (this.debug) {
    console.error(`[DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }
}
```

**Usage:**
```bash
DEBUG=true node index.js
```

### Memory Analysis

**Add Memory Usage Monitoring:**
```javascript
getStats() {
  const memoryUsage = process.memoryUsage();
  return {
    entities: this.entities.size,
    relations: this.relations.length,
    memoryUsage: {
      rss: Math.round(memoryUsage.rss / 1024 / 1024) + 'MB',
      heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024) + 'MB'
    }
  };
}
```

### Network Debugging

**Test Raw MCP Protocol:**
```bash
# Test initialize
echo '{"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}},"jsonrpc":"2.0","id":0}' | node index.js

# Test tools list
echo '{"method":"tools/list","params":{},"jsonrpc":"2.0","id":1}' | node index.js
```

## 📊 Monitoring & Metrics

### Health Check Endpoint

**Add to server:**
```javascript
server.setRequestHandler("health/check", async () => {
  return {
    status: "healthy",
    timestamp: new Date().toISOString(),
    stats: memoryServer.getStats(),
    uptime: process.uptime()
  };
});
```

### Log Analysis

**Parse Server Logs:**
```bash
# Filter error logs
grep -i error ~/.local/share/Claude/logs/mcp-server-memory.log

# Check connection attempts
grep -i "connection\|connect" ~/.local/share/Claude/logs/mcp-server-memory.log

# Tool usage patterns
grep -i "tool.*call" ~/.local/share/Claude/logs/mcp-server-memory.log
```

### Performance Profiling

**Add Timing Middleware:**
```javascript
async function withTiming(name, fn) {
  const start = Date.now();
  try {
    const result = await fn();
    console.error(`${name} completed in ${Date.now() - start}ms`);
    return result;
  } catch (error) {
    console.error(`${name} failed after ${Date.now() - start}ms:`, error.message);
    throw error;
  }
}

// Usage
createEntities(entities) {
  return withTiming('createEntities', () => {
    // ... implementation
  });
}
```

## 🛠 Development Debugging

### VSCode Launch Configuration

**.vscode/launch.json:**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug MCP Server",
      "type": "node",
      "request": "launch",
      "program": "${workspaceFolder}/index.js",
      "env": {
        "DEBUG": "true",
        "MEMORY_PATH": "${workspaceFolder}/debug-memory"
      },
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```

### Unit Testing Framework

**Add to test-server.js:**
```javascript
class TestFramework {
  constructor() {
    this.tests = [];
    this.results = { passed: 0, failed: 0 };
  }

  async test(name, fn) {
    try {
      await fn();
      console.log(`✅ ${name}`);
      this.results.passed++;
    } catch (error) {
      console.error(`❌ ${name}: ${error.message}`);
      this.results.failed++;
    }
  }

  summary() {
    const total = this.results.passed + this.results.failed;
    console.log(`\n📊 Test Results: ${this.results.passed}/${total} passed`);
    return this.results.failed === 0;
  }
}
```

## 🔍 Troubleshooting Checklist

### Before Reporting Issues

- [ ] Run `node test-server.js` - does it pass?
- [ ] Check `node -c index.js` - syntax valid?
- [ ] Verify MCP Inspector connection
- [ ] Check file permissions on memory path
- [ ] Review recent logs for errors
- [ ] Test with minimal configuration
- [ ] Verify Node.js version (18+)
- [ ] Check @modelcontextprotocol/sdk version

### Information to Gather

When reporting issues, include:

1. **Environment:**
   - Node.js version: `node --version`
   - Package versions: `npm list`
   - Operating system
   - Memory file location

2. **Error Details:**
   - Complete error message
   - Stack trace
   - Steps to reproduce
   - Expected vs actual behavior

3. **Logs:**
   - Server startup logs
   - Client connection logs
   - MCP Inspector console output

4. **Configuration:**
   - Environment variables
   - Memory file contents (anonymized)
   - Client configuration

This debugging guide should help you resolve most common issues with the Simple Memory MCP Server. For additional support, refer to the MCP protocol documentation or community resources.