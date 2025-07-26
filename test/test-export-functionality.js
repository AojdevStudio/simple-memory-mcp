#!/usr/bin/env node

/**
 * Comprehensive Test Suite for export_to_obsidian Tool
 * Tests the new MCP export functionality and Obsidian integration
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

class ExportTestSuite {
  constructor() {
    this.testDir = path.join(os.tmpdir(), 'mcp-export-test');
    this.client = null;
    this.transport = null;
    this.testResults = [];
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      'info': '📝',
      'success': '✅',
      'error': '❌',
      'test': '🧪',
      'setup': '⚙️'
    }[type] || '📝';
    
    const logMessage = `${prefix} ${message}`;
    console.log(logMessage);
    
    this.testResults.push({
      timestamp,
      type,
      message: logMessage
    });
  }

  async setupTestEnvironment() {
    this.log('Setting up test environment...', 'setup');
    
    // Create test directory
    await fs.mkdir(this.testDir, { recursive: true });
    this.log(`Created test directory: ${this.testDir}`, 'setup');
    
    // Connect to MCP server
    this.transport = new StdioClientTransport({
      command: 'node',
      args: [path.join(process.cwd(), 'index.js')]
    });

    this.client = new Client({
      name: 'export-test-client',
      version: '1.0.0'
    }, {
      capabilities: { tools: {} }
    });

    await this.client.connect(this.transport);
    this.log('Connected to MCP server', 'setup');
  }

  async createTestData() {
    this.log('Creating test data...', 'setup');
    
    // Create test entities
    const testEntities = [
      {
        name: 'john-doe',
        entityType: 'person',
        observations: ['Software Engineer', 'Works remotely', 'Enjoys hiking', 'Expert in Node.js']
      },
      {
        name: 'acme-corp',
        entityType: 'organization',
        observations: ['Tech startup', 'AI/ML focus', 'Series A funding', 'Remote-first company']
      },
      {
        name: 'project-alpha',
        entityType: 'project',
        observations: ['Machine learning initiative', 'Q1 2024 deadline', 'High priority', 'Needs data scientist']
      }
    ];

    const result = await this.client.callTool({
      name: 'create_entities',
      arguments: { entities: testEntities }
    });

    this.log(`Created ${testEntities.length} test entities`, 'setup');

    // Create test relations
    const testRelations = [
      { from: 'john-doe', to: 'acme-corp', relationType: 'works_for' },
      { from: 'john-doe', to: 'project-alpha', relationType: 'assigned_to' },
      { from: 'acme-corp', to: 'project-alpha', relationType: 'sponsors' }
    ];

    await this.client.callTool({
      name: 'create_relations',
      arguments: { relations: testRelations }
    });

    this.log(`Created ${testRelations.length} test relations`, 'setup');
    return { entities: testEntities, relations: testRelations };
  }

  async testMarkdownExport() {
    this.log('Testing Markdown export format...', 'test');
    
    const vaultPath = path.join(this.testDir, 'markdown-vault');
    
    try {
      const result = await this.client.callTool({
        name: 'export_to_obsidian',
        arguments: {
          vaultPath,
          format: 'markdown',
          autoIndex: true
        }
      });

      const response = JSON.parse(result.content[0].text);
      
      if (response.success) {
        this.log('Markdown export successful', 'success');
        
        // Verify files were created
        const entitiesDir = path.join(vaultPath, 'Entities');
        const files = await fs.readdir(entitiesDir);
        
        if (files.length >= 3) {
          this.log(`Created ${files.length} entity files`, 'success');
        } else {
          throw new Error(`Expected at least 3 files, got ${files.length}`);
        }
        
        // Check index file
        const indexFile = path.join(vaultPath, 'Knowledge Graph Index.md');
        await fs.access(indexFile);
        this.log('Index file created successfully', 'success');
        
        return true;
      } else {
        throw new Error('Export returned failure status');
      }
    } catch (error) {
      this.log(`Markdown export failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testDataviewExport() {
    this.log('Testing Dataview export format...', 'test');
    
    const vaultPath = path.join(this.testDir, 'dataview-vault');
    
    try {
      const result = await this.client.callTool({
        name: 'export_to_obsidian',
        arguments: {
          vaultPath,
          format: 'dataview',
          autoIndex: true
        }
      });

      const response = JSON.parse(result.content[0].text);
      
      if (response.success) {
        this.log('Dataview export successful', 'success');
        
        // Verify insights directory
        const insightsDir = path.join(vaultPath, 'Insights');
        const files = await fs.readdir(insightsDir);
        
        if (files.length >= 3) {
          this.log(`Created ${files.length} dataview files`, 'success');
        } else {
          throw new Error(`Expected at least 3 files, got ${files.length}`);
        }
        
        // Check business intelligence file
        const biFile = path.join(vaultPath, 'Business Intelligence.md');
        await fs.access(biFile);
        this.log('Business Intelligence file created', 'success');
        
        return true;
      } else {
        throw new Error('Export returned failure status');
      }
    } catch (error) {
      this.log(`Dataview export failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testCanvasExport() {
    this.log('Testing Canvas export format...', 'test');
    
    const vaultPath = path.join(this.testDir, 'canvas-vault');
    
    try {
      const result = await this.client.callTool({
        name: 'export_to_obsidian',
        arguments: {
          vaultPath,
          format: 'canvas',
          autoIndex: true
        }
      });

      const response = JSON.parse(result.content[0].text);
      
      if (response.success) {
        this.log('Canvas export successful', 'success');
        
        // Verify canvas file
        const canvasFile = path.join(vaultPath, 'Entity Network.canvas');
        await fs.access(canvasFile);
        
        // Read and validate canvas structure
        const canvasData = JSON.parse(await fs.readFile(canvasFile, 'utf8'));
        
        if (canvasData.nodes && canvasData.edges) {
          this.log(`Canvas created with ${canvasData.nodes.length} nodes and ${canvasData.edges.length} edges`, 'success');
          return true;
        } else {
          throw new Error('Canvas file missing nodes or edges');
        }
      } else {
        throw new Error('Export returned failure status');
      }
    } catch (error) {
      this.log(`Canvas export failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testAllFormatsExport() {
    this.log('Testing All formats export...', 'test');
    
    const vaultPath = path.join(this.testDir, 'all-formats-vault');
    
    try {
      const result = await this.client.callTool({
        name: 'export_to_obsidian',
        arguments: {
          vaultPath,
          format: 'all',
          autoIndex: true
        }
      });

      const response = JSON.parse(result.content[0].text);
      
      if (response.success) {
        this.log('All formats export successful', 'success');
        
        // Verify all formats were created
        const checks = [
          { path: path.join(vaultPath, 'Entities'), desc: 'Markdown entities' },
          { path: path.join(vaultPath, 'Analytics', 'Insights'), desc: 'Dataview analytics' },
          { path: path.join(vaultPath, 'Visual', 'Entity Network.canvas'), desc: 'Canvas visualization' }
        ];
        
        for (const check of checks) {
          await fs.access(check.path);
          this.log(`${check.desc} created successfully`, 'success');
        }
        
        return true;
      } else {
        throw new Error('Export returned failure status');
      }
    } catch (error) {
      this.log(`All formats export failed: ${error.message}`, 'error');
      return false;
    }
  }

  async testInvalidPath() {
    this.log('Testing invalid path handling...', 'test');
    
    try {
      const result = await this.client.callTool({
        name: 'export_to_obsidian',
        arguments: {
          vaultPath: '/invalid/path/that/does/not/exist',
          format: 'markdown'
        }
      });

      const response = JSON.parse(result.content[0].text);
      
      if (response.error) {
        this.log('Invalid path correctly rejected', 'success');
        return true;
      } else {
        this.log('Invalid path should have been rejected', 'error');
        return false;
      }
    } catch (error) {
      this.log('Invalid path handling test passed', 'success');
      return true;
    }
  }

  async testPerformanceMetrics() {
    this.log('Testing performance metrics...', 'test');
    
    const vaultPath = path.join(this.testDir, 'performance-vault');
    const startTime = Date.now();
    
    try {
      const result = await this.client.callTool({
        name: 'export_to_obsidian',
        arguments: {
          vaultPath,
          format: 'markdown'
        }
      });

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      const response = JSON.parse(result.content[0].text);
      
      if (response.success) {
        this.log(`Export completed in ${duration}ms`, 'success');
        this.log(`Entity count: ${response.entityCount}`, 'info');
        this.log(`Relation count: ${response.relationCount}`, 'info');
        
        // Performance threshold (should complete within 5 seconds for small dataset)
        if (duration < 5000) {
          this.log('Performance test passed', 'success');
          return true;
        } else {
          this.log('Performance test failed - export took too long', 'error');
          return false;
        }
      } else {
        throw new Error('Export failed');
      }
    } catch (error) {
      this.log(`Performance test failed: ${error.message}`, 'error');
      return false;
    }
  }

  async cleanup() {
    this.log('Cleaning up test environment...', 'setup');
    
    try {
      if (this.client) {
        await this.client.close();
      }
      
      // Clean up test directory
      await fs.rm(this.testDir, { recursive: true, force: true });
      this.log('Test cleanup completed', 'success');
    } catch (error) {
      this.log(`Cleanup warning: ${error.message}`, 'error');
    }
  }

  async runAllTests() {
    const tests = [
      { name: 'Markdown Export', fn: () => this.testMarkdownExport() },
      { name: 'Dataview Export', fn: () => this.testDataviewExport() },
      { name: 'Canvas Export', fn: () => this.testCanvasExport() },
      { name: 'All Formats Export', fn: () => this.testAllFormatsExport() },
      { name: 'Invalid Path Handling', fn: () => this.testInvalidPath() },
      { name: 'Performance Metrics', fn: () => this.testPerformanceMetrics() }
    ];

    this.log('🧪 Starting Export Functionality Test Suite...', 'test');
    
    try {
      await this.setupTestEnvironment();
      await this.createTestData();
      
      let passed = 0;
      let failed = 0;
      
      for (const test of tests) {
        this.log(`\n--- ${test.name} ---`, 'test');
        const result = await test.fn();
        
        if (result) {
          passed++;
        } else {
          failed++;
        }
      }
      
      this.log('\n=== TEST SUMMARY ===', 'test');
      this.log(`✅ Passed: ${passed}`, 'success');
      this.log(`❌ Failed: ${failed}`, failed > 0 ? 'error' : 'info');
      this.log(`📊 Success Rate: ${((passed / tests.length) * 100).toFixed(1)}%`, 'info');
      
      if (failed === 0) {
        this.log('\n🎉 All export functionality tests passed!', 'success');
      } else {
        this.log('\n⚠️  Some tests failed. Check output above for details.', 'error');
      }
      
      return failed === 0;
      
    } catch (error) {
      this.log(`Test suite failed: ${error.message}`, 'error');
      return false;
    } finally {
      await this.cleanup();
    }
  }

  getTestReport() {
    return {
      timestamp: new Date().toISOString(),
      results: this.testResults,
      testDirectory: this.testDir
    };
  }
}

// Run tests if called directly
async function main() {
  const testSuite = new ExportTestSuite();
  const success = await testSuite.runAllTests();
  
  // Generate test report
  const report = testSuite.getTestReport();
  
  process.exit(success ? 0 : 1);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { ExportTestSuite };