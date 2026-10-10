# One-Click Installation Implementation Plan

## 🎯 Overview

This document details the implementation plan for a one-click installation system inspired by Desktop Commander's approach, enabling users to install and configure the Simple Memory MCP Server with a single command.

## 🚀 Target User Experience

### Installation Command
```bash
npx @simple-memory/mcp-server@latest setup
```

### Expected Flow
1. User runs the npx command
2. Script auto-detects MCP clients (Claude Desktop, Cursor, etc.)
3. Automatically configures server in client configs
4. Verifies installation and connectivity
5. Provides usage instructions and next steps

## 🏗️ Technical Architecture

### Package Structure
```
@simple-memory/mcp-server/
├── package.json              # NPM package configuration
├── index.js                  # Main MCP server entry point
├── setup-claude-server.js    # Installation wizard
├── install.sh               # Bash installer for macOS/Linux
├── uninstall.js             # Uninstallation utility
├── src/
│   ├── server.js            # Core MCP server logic
│   ├── memory.js            # Memory management
│   └── tools/               # MCP tool implementations
├── scripts/
│   ├── detect-clients.js    # MCP client detection
│   ├── config-manager.js    # Configuration file management
│   └── verify-install.js    # Installation verification
└── docs/
    ├── README.md            # Main documentation
    └── TROUBLESHOOTING.md   # Installation issues
```

### Package.json Configuration
```json
{
  "name": "@simple-memory/mcp-server",
  "version": "1.0.0",
  "description": "Simple Memory MCP Server - Persistent knowledge graph storage for AI assistants",
  "keywords": ["mcp", "memory", "ai", "claude", "knowledge-graph", "assistant"],
  "homepage": "https://github.com/simple-memory/mcp-server",
  "repository": {
    "type": "git",
    "url": "https://github.com/simple-memory/mcp-server.git"
  },
  "bin": {
    "simple-memory-mcp": "./index.js",
    "setup": "./setup-claude-server.js"
  },
  "scripts": {
    "start": "node index.js",
    "setup": "node setup-claude-server.js",
    "setup:debug": "node setup-claude-server.js --debug",
    "uninstall": "node uninstall.js"
  },
  "engines": {
    "node": ">=18.0.0"
  },
  "license": "MIT"
}
```

## 🔧 Installation Wizard Implementation

### Setup Script Architecture
```javascript
// setup-claude-server.js
#!/usr/bin/env node

const { MCPSetupWizard } = require('./scripts/setup-wizard');

class MCPSetupWizard {
  constructor(options = {}) {
    this.debug = options.debug || false;
    this.uninstall = options.uninstall || false;
    this.force = options.force || false;
  }

  async run() {
    console.log('🧠 Simple Memory MCP Server Setup');
    
    try {
      if (this.uninstall) {
        return await this.uninstallServer();
      }
      
      // 1. System checks
      await this.performSystemChecks();
      
      // 2. Detect MCP clients
      const clients = await this.detectMCPClients();
      
      // 3. Configure each client
      for (const client of clients) {
        await this.configureClient(client);
      }
      
      // 4. Verify installation
      await this.verifyInstallation();
      
      // 5. Provide usage instructions
      this.showUsageInstructions();
      
      console.log('✅ Setup completed successfully!');
      
    } catch (error) {
      console.error('❌ Setup failed:', error.message);
      if (this.debug) {
        console.error(error.stack);
      }
      process.exit(1);
    }
  }

  async performSystemChecks() {
    // Check Node.js version
    // Check file system permissions
    // Check available disk space
    // Validate network connectivity
  }

  async detectMCPClients() {
    const clients = [];
    
    // Claude Desktop detection
    const claudeConfig = this.findClaudeDesktopConfig();
    if (claudeConfig) {
      clients.push({
        name: 'Claude Desktop',
        type: 'claude',
        configPath: claudeConfig,
        executable: this.findClaudeExecutable()
      });
    }
    
    // Cursor IDE detection
    const cursorConfig = this.findCursorConfig();
    if (cursorConfig) {
      clients.push({
        name: 'Cursor IDE', 
        type: 'cursor',
        configPath: cursorConfig,
        executable: this.findCursorExecutable()
      });
    }
    
    return clients;
  }

  findClaudeDesktopConfig() {
    const paths = {
      darwin: path.join(os.homedir(), 'Library/Application Support/Claude/claude_desktop_config.json'),
      win32: path.join(os.homedir(), 'AppData/Roaming/Claude/claude_desktop_config.json'),
      linux: path.join(os.homedir(), '.config/Claude/claude_desktop_config.json')
    };
    
    const configPath = paths[process.platform];
    return fs.existsSync(configPath) ? configPath : null;
  }

  async configureClient(client) {
    console.log(`⚙️ Configuring ${client.name}...`);
    
    // Backup existing config
    await this.backupConfig(client.configPath);
    
    // Read current configuration
    const config = await this.readConfig(client.configPath);
    
    // Add MCP server configuration
    config.mcpServers = config.mcpServers || {};
    config.mcpServers['simple-memory'] = this.createServerConfig();
    
    // Write updated configuration
    await this.writeConfig(client.configPath, config);
    
    console.log(`✅ ${client.name} configured successfully`);
  }

  createServerConfig() {
    const serverConfig = {
      command: "npx",
      args: ["-y", "@simple-memory/mcp-server"]
    };
    
    if (this.debug) {
      serverConfig.args.push("--debug");
    }
    
    return serverConfig;
  }

  async verifyInstallation() {
    console.log('🔍 Verifying installation...');
    
    // Test MCP server startup
    // Verify tool registration
    // Test basic functionality
    // Check memory file creation
    
    console.log('✅ Installation verified');
  }

  showUsageInstructions() {
    console.log(`
📖 Usage Instructions:

1. Restart your MCP client (Claude Desktop, Cursor, etc.)
2. The Simple Memory MCP Server will be available with these tools:
   - create_entities: Store entities with observations
   - read_graph: Retrieve complete knowledge graph
   
3. Example usage in Claude:
   "Store that John is a project manager who likes coffee"
   "Show me everything I know about my team"

4. Memory is persisted to: ~/.cursor/memory.json

For troubleshooting, visit: https://github.com/simple-memory/mcp-server/docs
    `);
  }
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  const options = {
    debug: args.includes('--debug'),
    uninstall: args.includes('--uninstall'),
    force: args.includes('--force')
  };
  
  const wizard = new MCPSetupWizard(options);
  wizard.run();
}
```

## 📋 Configuration Management

### Cross-Platform Config Paths
```javascript
// scripts/config-manager.js
const CONFIG_PATHS = {
  claude: {
    darwin: '~/Library/Application Support/Claude/claude_desktop_config.json',
    win32: '%APPDATA%/Claude/claude_desktop_config.json',
    linux: '~/.config/Claude/claude_desktop_config.json'
  },
  cursor: {
    darwin: '~/Library/Application Support/Cursor/User/settings.json',
    win32: '%APPDATA%/Cursor/User/settings.json', 
    linux: '~/.config/Cursor/User/settings.json'
  }
};

class ConfigManager {
  static expandPath(configPath) {
    return configPath
      .replace('~', os.homedir())
      .replace('%APPDATA%', process.env.APPDATA || os.homedir());
  }

  static async backupConfig(configPath) {
    const backupPath = `${configPath}.backup.${Date.now()}`;
    await fs.copyFile(configPath, backupPath);
    console.log(`📋 Config backed up to: ${backupPath}`);
  }

  static async safeConfigUpdate(configPath, updateFn) {
    // Atomic configuration updates with rollback capability
    const tempPath = `${configPath}.tmp`;
    
    try {
      const config = await this.readConfig(configPath);
      const updatedConfig = updateFn(config);
      
      // Write to temp file first
      await this.writeConfig(tempPath, updatedConfig);
      
      // Validate JSON syntax
      await this.validateConfig(tempPath);
      
      // Atomic move
      await fs.rename(tempPath, configPath);
      
    } catch (error) {
      // Clean up temp file on failure
      if (fs.existsSync(tempPath)) {
        await fs.unlink(tempPath);
      }
      throw error;
    }
  }
}
```

## 🔍 Installation Verification

### Health Check System
```javascript
// scripts/verify-install.js
class InstallationVerifier {
  async runHealthChecks() {
    const checks = [
      this.checkServerStartup(),
      this.checkToolRegistration(), 
      this.checkMemoryFileAccess(),
      this.checkClientConnectivity()
    ];
    
    const results = await Promise.allSettled(checks);
    return this.analyzeResults(results);
  }

  async checkServerStartup() {
    // Spawn MCP server process
    // Verify it starts without errors
    // Check tool list response
  }

  async checkToolRegistration() {
    // Verify create_entities tool available
    // Verify read_graph tool available
    // Check tool schemas are valid
  }

  async checkMemoryFileAccess() {
    // Test memory file creation
    // Verify read/write permissions
    // Check file format validity
  }

  async checkClientConnectivity() {
    // Test MCP client connection
    // Verify tool calls work end-to-end
    // Check error handling
  }
}
```

## 📦 Distribution Strategy

### NPM Publishing Preparation
```json
{
  "publishConfig": {
    "access": "public",
    "registry": "https://registry.npmjs.org/"
  },
  "files": [
    "index.js",
    "setup-claude-server.js", 
    "src/",
    "scripts/",
    "docs/README.md"
  ]
}
```

### Release Automation
```yaml
# .github/workflows/release.yml
name: Release
on:
  push:
    tags: ['v*']
jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm test
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

## 🛠️ Alternative Installation Methods

### Bash Installer (macOS/Linux)
```bash
#!/bin/bash
# install.sh

set -e

echo "🧠 Simple Memory MCP Server Installer"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js first."
    exit 1
fi

# Install via npx
echo "📦 Installing MCP server..."
npx @simple-memory/mcp-server@latest setup

echo "✅ Installation complete!"
```

### Smithery Integration
```yaml
# smithery.yaml
name: "@simple-memory/mcp-server"
description: "Simple Memory MCP Server - Persistent knowledge graph storage"
author: "Simple Memory Team"
license: "MIT"
homepage: "https://github.com/simple-memory/mcp-server"
repository: "https://github.com/simple-memory/mcp-server"
mcpServers:
  simple-memory:
    command: "npx"
    args: ["-y", "@simple-memory/mcp-server"]
```

## 🔧 Debug and Troubleshooting

### Debug Mode Features
```bash
# Enable debug mode
npx @simple-memory/mcp-server@latest setup --debug

# Provides:
# - Verbose logging
# - Step-by-step progress
# - Detailed error messages
# - Configuration validation
# - Connection testing
```

### Common Issues & Solutions
```javascript
// scripts/troubleshoot.js
const COMMON_ISSUES = {
  'CONFIG_NOT_FOUND': {
    message: 'Claude Desktop config file not found',
    solution: 'Install Claude Desktop first, then run setup again'
  },
  'PERMISSION_DENIED': {
    message: 'Permission denied writing config file',
    solution: 'Run with appropriate permissions or use --force flag'
  },
  'NODE_VERSION_OLD': {
    message: 'Node.js version too old',
    solution: 'Update to Node.js 18+ and try again'
  },
  'SERVER_START_FAILED': {
    message: 'MCP server failed to start',
    solution: 'Check logs and verify dependencies'
  }
};
```

## 🎯 Success Metrics

### Installation Success Criteria
- ✅ Zero-config installation for 95% of users
- ✅ < 30 seconds total installation time
- ✅ Automatic updates on Claude restart
- ✅ Cross-platform compatibility (Windows, macOS, Linux)
- ✅ Graceful error handling and recovery
- ✅ Clear troubleshooting guidance

### User Experience Goals
- **Simple:** Single command installation
- **Reliable:** Robust error handling and rollback
- **Fast:** Quick setup and verification
- **Safe:** Config backups and validation
- **Helpful:** Clear instructions and troubleshooting

This implementation plan provides a comprehensive roadmap for creating a Desktop Commander-style one-click installation system for the Simple Memory MCP Server.