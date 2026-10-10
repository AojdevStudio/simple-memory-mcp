# Simple Memory MCP Server - Claude Protocol Framework

## Project Context
This is a **Simple Memory MCP Server** - a lightweight Model Context Protocol server that provides persistent knowledge graph storage for AI assistants. The server implements create_entities and read_graph tools to enable AI assistants to maintain persistent memory across sessions through entity-relationship storage.

**Tech Stack**: Node.js, @modelcontextprotocol/sdk  
**Architecture**: Simple client-server with JSON file persistence  
**Storage**: In-memory Map with filesystem persistence to ~/.cursor/memory.json  

---

# Core Meta-Cognitive Framework

## Project Understanding Schema
```yaml
project_domain: "MCP Server Development"
primary_functions:
  - entity_creation: "Store entities with name, type, and observations"
  - graph_reading: "Retrieve complete knowledge graph state"
  - persistence: "JSON-based filesystem storage"
  - memory_management: "In-memory operations with async persistence"
key_patterns:
  - mcp_tools: "Standard MCP tool registration and handling"
  - async_storage: "File system operations with error handling"
  - graph_structure: "Entities (Map) + Relations (Array) data model"
```

## Problem Analysis Schema
When analyzing issues:
1. **Storage Layer**: Check memory.json file integrity and permissions
2. **MCP Protocol**: Verify tool registration and request/response format
3. **Data Model**: Validate entity structure and relationship consistency
4. **Error Handling**: Review async operations and error propagation
5. **Performance**: Consider memory usage and file I/O efficiency

## Decision Making Protocol
For technical decisions:
- **Simplicity First**: Maintain lightweight, focused implementation
- **MCP Compliance**: Follow Model Context Protocol standards
- **Data Integrity**: Ensure consistent entity/relation storage
- **Error Recovery**: Graceful handling of corrupted or missing data
- **Repository Hygiene**: Maintain clean, professional repository practices

---

# Development Workflow Protocols

## Primary Development Workflow
```yaml
development_cycle:
  1_explore: "Understand MCP protocol requirements and data needs"
  2_plan: "Design entity/relation schema and storage strategy" 
  3_implement: "Code MCP handlers and storage operations"
  4_test: "Verify tool functionality and data persistence"
  5_validate: "Test integration with MCP clients"
  6_cleanup: "Remove dead code, optimize imports, check .gitignore"
  7_commit: "Version control with descriptive messages"
```

## MCP Server Testing Protocol
```yaml
testing_approach:
  unit_testing:
    - entity_creation: "Verify entity storage and retrieval"
    - graph_operations: "Test complete graph read functionality"
    - persistence: "Validate file save/load operations"
  integration_testing:
    - mcp_client: "Test with actual MCP clients (Cursor, Claude)"
    - tool_discovery: "Verify tools/list endpoint"
    - tool_execution: "Test tools/call with various inputs"
  manual_testing:
    - startup: "Verify server initialization and memory loading"
    - concurrent_access: "Test multiple simultaneous operations"
    - error_scenarios: "Corrupted files, permission issues"
```

---

# Code Quality & Analysis Tools

## MCP Server Code Analysis
```yaml
analysis_focus_areas:
  protocol_compliance:
    - tool_schema: "Validate JSON schema for MCP tools"
    - request_handling: "Ensure proper request/response format"
    - error_responses: "Standard MCP error handling patterns"
  data_integrity:
    - entity_validation: "Required fields (name, entityType, observations)"
    - storage_atomicity: "Safe file write operations"
    - memory_consistency: "In-memory state matches persisted data"
  performance_patterns:
    - memory_usage: "Map vs Array performance for entities"
    - file_io: "Async operations and error handling"
    - startup_time: "Memory loading efficiency"
```

## Node.js Specific Quality Checks
- **ES Modules**: Verify proper import/export syntax
- **Async/Await**: Consistent error handling patterns
- **File Operations**: Proper path handling and permissions
- **Process Management**: Environment variable usage and exit handling

---

# MCP Server Management

## Tool Development Protocol
```yaml
adding_new_tools:
  1_schema_design: "Define input/output JSON schema"
  2_handler_implementation: "Create tools/call handler"
  3_registration: "Add to tools/list response"
  4_testing: "Verify with MCP client integration"
  5_documentation: "Update tool descriptions and examples"

tool_categories:
  memory_management:
    - create_entities: "Batch entity creation with validation"
    - read_graph: "Complete knowledge graph retrieval"
  potential_extensions:
    - update_entities: "Modify existing entity observations"
    - create_relations: "Add relationships between entities"
    - query_graph: "Search entities by type or content"
```

## Storage & Persistence Management
```yaml
storage_patterns:
  file_operations:
    - path_resolution: "Environment-aware storage location"
    - atomic_writes: "Safe file update procedures"
    - backup_strategy: "Versioned backup for data recovery"
  memory_management:
    - initialization: "Load existing data on startup"
    - consistency: "Sync in-memory and file state"
    - cleanup: "Handle memory growth and optimization"
```

---

# Integration & Deployment

## MCP Client Integration
```yaml
client_setup:
  cursor_ide:
    - configuration: "Add server to MCP settings"
    - testing: "Verify tool availability in IDE"
    - usage_patterns: "Entity creation and graph queries"
  claude_desktop:
    - mcp_config: "Configure server in Claude desktop"
    - tool_access: "Verify tool discovery and execution"
    - memory_persistence: "Validate cross-session memory"
```

## Deployment & Distribution
```yaml
packaging:
  npm_package:
    - dependencies: "Minimal MCP SDK dependency"
    - scripts: "Start command and development scripts"
    - metadata: "Clear description and usage instructions"
  distribution:
    - local_install: "Direct file usage and npm link"
    - registry_publish: "NPM package distribution"
    - documentation: "Setup and integration guides"
```

---

# Repository Hygiene & Maintenance

## Code Quality Standards
```yaml
repository_hygiene:
  file_exclusions:
    - runtime_logs: "logs/ directory should not be committed"
    - temp_files: "Use .gitignore for temporary and generated files"
    - personal_config: ".claude/ directory for personal configurations only"
    - environment_files: "Never commit .env files or API keys"
  code_cleanliness:
    - dead_code: "Remove unused functions, deprecated methods"
    - imports: "Clean up unused imports and dependencies"
    - console_logs: "Remove debug console.log statements before commit"
    - comments: "Remove TODO/FIXME comments or track in issues"
  performance_awareness:
    - resource_usage: "Avoid continuous file watching or polling"
    - memory_leaks: "Clean up event listeners and timers"
    - async_patterns: "Use proper async/await error handling"
```

## .gitignore Maintenance
```yaml
essential_exclusions:
  dependencies: ["node_modules/", "package-lock.json"]
  runtime: ["logs/", "*.log", "debug.log", "inspector-config.json"]
  environment: [".env", ".env.local", ".env.production"]
  ide_files: [".vscode/", ".idea/", "*.swp", "*.swo"]
  system: [".DS_Store", "Thumbs.db"]
  temp: ["temp/", "tmp/", "*.tmp"]
```

## Commit Standards
- **Descriptive Messages**: Clear purpose and impact description
- **Small, Focused Commits**: Single logical change per commit
- **Clean Working Directory**: No untracked files or debug artifacts
- **Pre-commit Validation**: Run tests and linting before commit
- **No Sensitive Data**: Never commit API keys, passwords, or personal data

---

# Self-Improvement Mechanisms

## Learning Protocol
```yaml
knowledge_capture:
  mcp_patterns:
    - successful_integrations: "Client setup configurations that work"
    - performance_optimizations: "Memory and file I/O improvements"
    - error_scenarios: "Common failure modes and solutions"
  development_insights:
    - testing_strategies: "Effective MCP server testing approaches"
    - debugging_techniques: "Troubleshooting MCP protocol issues"
    - architecture_decisions: "Storage and API design choices"
```

## Process Optimization
Track and improve:
- **Development Speed**: Time from concept to working MCP tool
- **Integration Success**: First-time setup success rate with clients
- **Error Recovery**: Robustness of error handling and data recovery
- **Performance**: Memory usage and file I/O efficiency metrics

## Knowledge Base Updates
Maintain documentation on:
- **MCP Protocol Evolution**: Updates to SDK and protocol standards
- **Client Compatibility**: Testing results with different MCP clients
- **Performance Benchmarks**: Storage and retrieval performance data
- **Integration Patterns**: Successful deployment and usage patterns

---

# Quick Start Guide

## Development Setup
```bash
# Clone and install
npm install

# Start server for testing
npm start

# Test MCP integration
# Configure in Cursor or Claude Desktop MCP settings
```

## Adding New Tools
1. Define tool schema in `tools/list` handler
2. Implement logic in `tools/call` handler  
3. Test with MCP client integration
4. Update documentation and examples

## Common Tasks
- **Debug Storage**: Check `~/.cursor/memory.json` file
- **Test Persistence**: Restart server and verify data retention
- **Add Validation**: Enhance entity schema validation
- **Performance Tuning**: Profile memory usage and file I/O
- **Repository Cleanup**: Run `/sc:cleanup` to remove dead code and optimize structure
- **Hygiene Check**: Verify .gitignore coverage and clean working directory

---

This protocol framework is designed to grow with your MCP server development needs while maintaining the simplicity and focused scope that makes this project effective.