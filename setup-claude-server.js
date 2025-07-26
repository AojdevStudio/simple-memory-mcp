#!/usr/bin/env node

/**
 * Simple Memory MCP Server - One-Click Setup
 * NPX-based installation and configuration for MCP clients
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class MCPSetupWizard {
  constructor() {
    this.packagePath = __dirname;
    this.serverPath = path.join(this.packagePath, 'index.js');
    this.debug = process.argv.includes('--debug');
    this.uninstall = process.argv.includes('--uninstall');
    this.config = {};
    this.configPath = path.join(os.homedir(), '.simple-memory-mcp-config');
  }

  log(message) {
    console.log(`🧠 ${message}`);
  }

  debug_log(message) {
    if (this.debug) {
      console.log(`🔍 DEBUG: ${message}`);
    }
  }

  error(message) {
    console.error(`❌ ${message}`);
  }

  success(message) {
    console.log(`✅ ${message}`);
  }

  async askQuestion(question, defaultValue = '') {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      const prompt = defaultValue 
        ? `${question} [${defaultValue}]: `
        : `${question}: `;
      
      rl.question(prompt, (answer) => {
        rl.close();
        resolve(answer.trim() || defaultValue);
      });
    });
  }

  async detectObsidianVaults() {
    const vaults = [];
    const platform = os.platform();
    const homeDir = os.homedir();
    
    // Common Obsidian vault locations
    const searchPaths = [
      path.join(homeDir, 'Documents'),
      path.join(homeDir, 'Desktop'),
      path.join(homeDir, 'Dropbox'),
      path.join(homeDir, 'iCloud Drive'),
      path.join(homeDir, 'OneDrive'),
      homeDir
    ];

    // Platform-specific paths
    if (platform === 'darwin') {
      searchPaths.push(path.join(homeDir, 'Documents/Obsidian'));
      searchPaths.push(path.join(homeDir, 'Library/Mobile Documents/com~apple~CloudDocs'));
    } else if (platform === 'win32') {
      searchPaths.push(path.join(homeDir, 'Documents\\Obsidian'));
    }

    for (const searchPath of searchPaths) {
      try {
        const entries = await fs.readdir(searchPath, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const fullPath = path.join(searchPath, entry.name);
            
            // Check for .obsidian folder (indicates Obsidian vault)
            try {
              await fs.access(path.join(fullPath, '.obsidian'));
              vaults.push({
                name: entry.name,
                path: fullPath
              });
            } catch {
              // Not an Obsidian vault, continue
            }
          }
        }
      } catch (error) {
        this.debug_log(`Could not search ${searchPath}: ${error.message}`);
      }
    }

    return vaults;
  }

  async interactiveConfiguration() {
    this.log('\n📋 Interactive Configuration');
    this.log('==============================\n');

    // Memory Path Configuration
    const defaultMemoryPath = path.join(os.homedir(), '.cursor', 'memory.json');
    this.log('📁 Memory Storage Configuration');
    this.config.memoryPath = await this.askQuestion(
      'Where should memory be stored?',
      defaultMemoryPath
    );
    
    // Ensure memory directory exists
    const memoryDir = path.dirname(this.config.memoryPath);
    await fs.mkdir(memoryDir, { recursive: true });
    this.debug_log(`Memory directory ensured: ${memoryDir}`);

    // Obsidian Integration
    this.log('\n🗂️  Obsidian Integration');
    const useObsidian = await this.askQuestion('Do you use Obsidian? (y/n)', 'n');
    
    if (useObsidian.toLowerCase() === 'y' || useObsidian.toLowerCase() === 'yes') {
      // Auto-detect vaults
      this.log('🔍 Detecting Obsidian vaults...');
      const detectedVaults = await this.detectObsidianVaults();
      
      if (detectedVaults.length > 0) {
        this.log('\n📚 Found Obsidian vaults:');
        detectedVaults.forEach((vault, index) => {
          this.log(`  ${index + 1}. ${vault.name} (${vault.path})`);
        });
        
        const vaultChoice = await this.askQuestion(
          `Choose vault (1-${detectedVaults.length}) or enter custom path`,
          '1'
        );
        
        const vaultIndex = parseInt(vaultChoice) - 1;
        if (vaultIndex >= 0 && vaultIndex < detectedVaults.length) {
          this.config.obsidianVaultPath = detectedVaults[vaultIndex].path;
          this.success(`Selected vault: ${detectedVaults[vaultIndex].name}`);
        } else {
          this.config.obsidianVaultPath = vaultChoice;
        }
      } else {
        this.log('No Obsidian vaults detected automatically.');
        this.config.obsidianVaultPath = await this.askQuestion(
          'Enter your Obsidian vault path'
        );
      }

      // Validate vault path
      try {
        await fs.access(this.config.obsidianVaultPath);
        
        // Auto-export settings
        const autoExport = await this.askQuestion(
          'Enable auto-export after entity creation? (y/n)',
          'n'
        );
        this.config.obsidianAutoExport = autoExport.toLowerCase() === 'y' || autoExport.toLowerCase() === 'yes';
        
        if (this.config.obsidianAutoExport) {
          this.config.obsidianExportFormat = await this.askQuestion(
            'Export format (markdown/dataview/canvas/all)',
            'markdown'
          );
        }
      } catch (error) {
        this.error(`Invalid vault path: ${this.config.obsidianVaultPath}`);
        this.config.obsidianVaultPath = '';
      }
    }

    return this.config;
  }

  async saveConfiguration() {
    try {
      const configContent = {
        memoryPath: this.config.memoryPath,
        obsidianVaultPath: this.config.obsidianVaultPath || '',
        obsidianAutoExport: this.config.obsidianAutoExport || false,
        obsidianExportFormat: this.config.obsidianExportFormat || 'markdown',
        createdAt: new Date().toISOString(),
        version: '1.1.0'
      };

      // Save as JSON for easy reading
      await fs.writeFile(
        this.configPath, 
        JSON.stringify(configContent, null, 2),
        'utf8'
      );

      // Also create a shell-compatible .env file
      const envPath = path.join(path.dirname(this.configPath), '.simple-memory-mcp.env');
      const envContent = [
        '# Simple Memory MCP Server Configuration',
        '# Generated by setup wizard',
        '',
        `MEMORY_PATH="${this.config.memoryPath}"`,
        this.config.obsidianVaultPath ? `OBSIDIAN_VAULT_PATH="${this.config.obsidianVaultPath}"` : '',
        `OBSIDIAN_AUTO_EXPORT=${this.config.obsidianAutoExport}`,
        `OBSIDIAN_EXPORT_FORMAT=${this.config.obsidianExportFormat}`,
        ''
      ].filter(line => line !== '').join('\n');

      await fs.writeFile(envPath, envContent, 'utf8');

      this.success(`Configuration saved to ${this.configPath}`);
      this.success(`Environment file saved to ${envPath}`);
      
      return true;
    } catch (error) {
      this.error(`Failed to save configuration: ${error.message}`);
      return false;
    }
  }

  async loadExistingConfiguration() {
    try {
      const data = await fs.readFile(this.configPath, 'utf8');
      this.config = JSON.parse(data);
      this.debug_log(`Loaded existing configuration from ${this.configPath}`);
      return true;
    } catch (error) {
      this.debug_log(`No existing configuration found: ${error.message}`);
      return false;
    }
  }

  async detectClients() {
    const clients = [];
    const platform = os.platform();
    
    // Claude Desktop config paths
    const claudePaths = {
      darwin: path.join(os.homedir(), 'Library/Application Support/Claude/claude_desktop_config.json'),
      win32: path.join(os.homedir(), 'AppData/Roaming/Claude/claude_desktop_config.json'),
      linux: path.join(os.homedir(), '.config/Claude/claude_desktop_config.json')
    };

    const claudePath = claudePaths[platform];
    if (claudePath) {
      try {
        await fs.access(claudePath);
        clients.push({
          name: 'Claude Desktop',
          configPath: claudePath,
          type: 'claude'
        });
        this.debug_log(`Found Claude Desktop config: ${claudePath}`);
      } catch (error) {
        this.debug_log(`Claude Desktop config not found: ${claudePath}`);
      }
    }

    // Cursor config paths (similar structure)
    const cursorPaths = {
      darwin: path.join(os.homedir(), 'Library/Application Support/Cursor/mcp_config.json'),
      win32: path.join(os.homedir(), 'AppData/Roaming/Cursor/mcp_config.json'), 
      linux: path.join(os.homedir(), '.config/Cursor/mcp_config.json')
    };

    const cursorPath = cursorPaths[platform];
    if (cursorPath) {
      try {
        await fs.access(cursorPath);
        clients.push({
          name: 'Cursor IDE',
          configPath: cursorPath,
          type: 'cursor'
        });
        this.debug_log(`Found Cursor config: ${cursorPath}`);
      } catch (error) {
        this.debug_log(`Cursor config not found: ${cursorPath}`);
      }
    }

    return clients;
  }

  async backupConfig(configPath) {
    const backupPath = `${configPath}.backup.${Date.now()}`;
    try {
      await fs.copyFile(configPath, backupPath);
      this.debug_log(`Created backup: ${backupPath}`);
      return backupPath;
    } catch (error) {
      this.error(`Failed to create backup: ${error.message}`);
      throw error;
    }
  }

  async configureClaudeDesktop(configPath) {
    try {
      let config = {};
      
      // Read existing config
      try {
        const data = await fs.readFile(configPath, 'utf8');
        config = JSON.parse(data);
      } catch (error) {
        this.debug_log(`Creating new Claude Desktop config`);
        // Ensure directory exists
        await fs.mkdir(path.dirname(configPath), { recursive: true });
      }

      // Initialize mcpServers if it doesn't exist
      if (!config.mcpServers) {
        config.mcpServers = {};
      }

      if (this.uninstall) {
        // Remove simple-memory server
        delete config.mcpServers['simple-memory'];
        this.log('Removed simple-memory server from Claude Desktop');
      } else {
        // Build environment configuration
        const serverEnv = {};
        
        if (this.config.memoryPath) {
          serverEnv.MEMORY_PATH = path.dirname(this.config.memoryPath);
        }
        
        if (this.config.obsidianVaultPath) {
          serverEnv.OBSIDIAN_VAULT_PATH = this.config.obsidianVaultPath;
        }
        
        if (this.config.obsidianAutoExport) {
          serverEnv.OBSIDIAN_AUTO_EXPORT = 'true';
          serverEnv.OBSIDIAN_EXPORT_FORMAT = this.config.obsidianExportFormat || 'markdown';
        }

        // Add simple-memory server with user configuration
        config.mcpServers['simple-memory'] = {
          command: 'node',
          args: [this.serverPath],
          env: Object.keys(serverEnv).length > 0 ? serverEnv : {
            MEMORY_PATH: path.join(os.homedir(), '.cursor')
          }
        };
        this.log('Added simple-memory server to Claude Desktop with custom configuration');
      }

      // Write updated config
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
      return true;
    } catch (error) {
      this.error(`Failed to configure Claude Desktop: ${error.message}`);
      throw error;
    }
  }

  async configureCursor(configPath) {
    try {
      let config = {};
      
      // Read existing config  
      try {
        const data = await fs.readFile(configPath, 'utf8');
        config = JSON.parse(data);
      } catch (error) {
        this.debug_log(`Creating new Cursor config`);
        // Ensure directory exists
        await fs.mkdir(path.dirname(configPath), { recursive: true });
      }

      // Initialize servers if it doesn't exist
      if (!config.servers) {
        config.servers = {};
      }

      if (this.uninstall) {
        // Remove simple-memory server
        delete config.servers['simple-memory'];
        this.log('Removed simple-memory server from Cursor');
      } else {
        // Build environment configuration
        const serverEnv = {};
        
        if (this.config.memoryPath) {
          serverEnv.MEMORY_PATH = path.dirname(this.config.memoryPath);
        }
        
        if (this.config.obsidianVaultPath) {
          serverEnv.OBSIDIAN_VAULT_PATH = this.config.obsidianVaultPath;
        }
        
        if (this.config.obsidianAutoExport) {
          serverEnv.OBSIDIAN_AUTO_EXPORT = 'true';
          serverEnv.OBSIDIAN_EXPORT_FORMAT = this.config.obsidianExportFormat || 'markdown';
        }

        // Add simple-memory server with user configuration
        config.servers['simple-memory'] = {
          command: 'node',
          args: [this.serverPath],
          env: Object.keys(serverEnv).length > 0 ? serverEnv : {
            MEMORY_PATH: path.join(os.homedir(), '.cursor')
          }
        };
        this.log('Added simple-memory server to Cursor with custom configuration');
      }

      // Write updated config
      await fs.writeFile(configPath, JSON.stringify(config, null, 2));
      return true;
    } catch (error) {
      this.error(`Failed to configure Cursor: ${error.message}`);
      throw error;
    }
  }

  async verifyInstallation() {
    try {
      // Check if server file exists
      await fs.access(this.serverPath);
      this.debug_log(`Server file found: ${this.serverPath}`);

      // Test basic server functionality
      const { spawn } = await import('child_process');
      
      return new Promise((resolve) => {
        const child = spawn('node', [this.serverPath], {
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let output = '';
        child.stderr.on('data', (data) => {
          output += data.toString();
        });

        child.on('close', (code) => {
          if (output.includes('Simple Memory MCP Server running')) {
            this.success('Server verification successful');
            resolve(true);
          } else {
            this.error('Server verification failed');
            resolve(false);
          }
        });

        // Send a quick test and close
        setTimeout(() => {
          child.kill();
        }, 2000);
      });
    } catch (error) {
      this.error(`Verification failed: ${error.message}`);
      return false;
    }
  }

  async showUsageInstructions() {
    this.log('\n📚 Simple Memory MCP Server Setup Complete!');
    this.log('\n🚀 Getting Started:');
    this.log('1. Restart Claude Desktop or Cursor');
    this.log('2. Use these MCP tools in your conversations:');
    this.log('   • create_entities - Store information about people, projects, etc.');
    this.log('   • read_graph - View your complete knowledge graph');
    this.log('   • search_nodes - Search through your stored information');
    this.log('   • export_to_obsidian - Export to Obsidian vault');
    
    this.log('\n📁 Your Configuration:');
    this.log(`   Memory: ${this.config.memoryPath || 'Default location'}`);
    if (this.config.obsidianVaultPath) {
      this.log(`   Obsidian Vault: ${this.config.obsidianVaultPath}`);
      this.log(`   Auto-export: ${this.config.obsidianAutoExport ? 'Enabled' : 'Disabled'}`);
      if (this.config.obsidianAutoExport) {
        this.log(`   Export Format: ${this.config.obsidianExportFormat}`);
      }
    }
    this.log(`   Config File: ${this.configPath}`);
    
    this.log('\n🎯 Example Usage:');
    this.log('   "Create an entity for John Doe, a software engineer at Acme Corp"');
    if (this.config.obsidianVaultPath) {
      this.log('   "Export my knowledge graph to Obsidian"');
    } else {
      this.log('   "Export my knowledge graph to my Obsidian vault at /path/to/vault"');
    }
    this.log('\n📖 Documentation: https://github.com/your-repo/simple-memory-mcp');
    this.log('\n💡 Pro Tip: Edit your config anytime by running the setup again!');
  }

  async run() {
    try {
      this.log('Simple Memory MCP Server Setup');
      this.log('================================\n');

      if (this.uninstall) {
        this.log('🗑️  Uninstalling Simple Memory MCP Server...\n');
      } else {
        this.log('🛠️  Installing Simple Memory MCP Server...\n');
        
        // Load existing configuration or create new one
        await this.loadExistingConfiguration();
        
        // Interactive configuration (only if not uninstalling)
        await this.interactiveConfiguration();
        
        // Save configuration
        await this.saveConfiguration();
      }

      // Detect MCP clients
      this.log('\n🔍 Detecting MCP clients...');
      const clients = await this.detectClients();
      
      if (clients.length === 0) {
        this.error('No supported MCP clients found.');
        this.log('\nSupported clients:');
        this.log('  • Claude Desktop');
        this.log('  • Cursor IDE');
        this.log('\nPlease install a supported client and try again.');
        return false;
      }

      this.success(`Found ${clients.length} MCP client(s):`);
      clients.forEach(client => {
        this.log(`  • ${client.name}: ${client.configPath}`);
      });

      // Configure each client
      this.log('\n⚙️ Configuring MCP clients...');
      
      for (const client of clients) {
        try {
          // Create backup
          await this.backupConfig(client.configPath);
          
          // Configure based on client type
          if (client.type === 'claude') {
            await this.configureClaudeDesktop(client.configPath);
          } else if (client.type === 'cursor') {
            await this.configureCursor(client.configPath);
          }
          
          this.success(`Configured ${client.name}`);
        } catch (error) {
          this.error(`Failed to configure ${client.name}: ${error.message}`);
        }
      }

      if (!this.uninstall) {
        // Verify installation
        this.log('\n🧪 Verifying installation...');
        const verified = await this.verifyInstallation();
        
        if (verified) {
          await this.showUsageInstructions();
        } else {
          this.error('Installation verification failed. Please check the logs above.');
          return false;
        }
      } else {
        this.success('Simple Memory MCP Server uninstalled successfully');
        this.log('Please restart your MCP clients to complete removal.');
      }

      return true;
    } catch (error) {
      this.error(`Setup failed: ${error.message}`);
      if (this.debug) {
        console.error(error.stack);
      }
      return false;
    }
  }
}

// CLI execution
async function main() {
  const wizard = new MCPSetupWizard();
  const success = await wizard.run();
  process.exit(success ? 0 : 1);
}

// Show help
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Simple Memory MCP Server Setup

Usage: npx @simple-memory/mcp-server@latest setup [options]

Options:
  --debug        Enable debug logging
  --uninstall    Remove server from MCP clients
  --help, -h     Show this help message

Examples:
  npx @simple-memory/mcp-server@latest setup
  npx @simple-memory/mcp-server@latest setup --debug
  npx @simple-memory/mcp-server@latest setup --uninstall
`);
  process.exit(0);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { MCPSetupWizard };