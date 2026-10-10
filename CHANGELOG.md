# Changelog

All notable changes to the Simple Memory MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Built-in Obsidian export functionality (MCP tools)
- Interactive mindmap generation for business intelligence
- Comprehensive documentation organization
- Repository hygiene protocols

### Changed
- Moved documentation to `docs/` folder for better organization
- Updated file watching approach (deprecated resource-intensive auto-watch)
- Enhanced .gitignore for better repository cleanliness

### Removed
- Resource-intensive auto-watch functionality from obsidian-converter
- Cluttered documentation files from root directory

## [1.1.0] - 2024-XX-XX

### Added
- Complete MCP server implementation with 9 tools
- Obsidian integration with multiple visualization formats
- Comprehensive test suite (`test-server.js`)
- TypeScript interfaces and schema validation
- Professional documentation suite

### Changed
- Updated to MCP SDK schema-based request handlers
- Enhanced error handling and validation
- Improved JSON file persistence with atomic operations

### Fixed
- MCP SDK compatibility issues with request handler syntax
- Missing capabilities declarations for prompts and resources
- Client constructor parameter structure

## [1.0.0] - 2024-XX-XX

### Added
- Initial release of Simple Memory MCP Server
- Basic entity and relation storage
- JSON file persistence to `~/.cursor/memory.json`
- Core MCP tools: `create_entities`, `read_graph`
- Node.js and ES modules support

### Features
- **Entity Management**: Create and store entities with observations
- **Graph Operations**: Read complete knowledge graph state
- **Persistence**: Automatic JSON file storage
- **MCP Compliance**: Full Model Context Protocol compatibility

---

## Release Notes

### Version Numbering
- **Major** (x.0.0): Breaking changes to API or data format
- **Minor** (1.x.0): New features, backward compatible
- **Patch** (1.1.x): Bug fixes, security updates

### Upgrade Notes

#### 1.1.0 → Unreleased
- No breaking changes
- New MCP export tools available
- Documentation moved to `docs/` folder

#### 1.0.0 → 1.1.0  
- Update MCP SDK imports to use schema-based handlers
- Add missing server capabilities declarations
- Update client constructor parameters

### Security Updates

See [SECURITY.md](./SECURITY.md) for security-related releases and disclosure policy.

---

*For detailed technical changes, see individual commit messages and documentation in the `docs/` folder.*