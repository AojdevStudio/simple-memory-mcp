# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.1.x   | :white_check_mark: |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability in the Simple Memory MCP Server, please report it responsibly:

### 🔒 Private Disclosure

**DO NOT** open a public GitHub issue for security vulnerabilities.

Instead, please:

1. **Email**: Send details to [security@your-domain.com] (replace with actual contact)
2. **Include**:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Suggested fix (if any)

### 📋 What to Expect

- **Acknowledgment**: Within 48 hours
- **Initial Assessment**: Within 5 business days  
- **Status Updates**: Weekly until resolved
- **Resolution Timeline**: Varies by severity
  - Critical: 7 days
  - High: 30 days
  - Medium: 90 days
  - Low: Next major release

## Security Considerations

### 🛡️ MCP Server Security

**Data Storage**:
- Memory data stored in local JSON files
- No network transmission of stored data
- File system permissions apply

**Input Validation**:
- All MCP tool inputs validated against JSON schemas
- Entity names and observations sanitized
- No code execution from user input

**Access Control**:
- Server runs with user permissions
- No privileged operations required
- Local file system access only

### 🔐 Best Practices

**For Users**:
- Run server with minimal required permissions
- Store memory files in secure directories
- Monitor memory file access patterns
- Regularly backup memory data

**For Developers**:
- Validate all input parameters
- Use parameterized file operations
- Implement proper error handling
- Follow secure coding practices

### ⚠️ Known Limitations

**File System Access**:
- Server requires read/write access to memory storage location
- No built-in encryption for stored data
- Temporary files may contain sensitive information

**Network Security**:
- Server designed for local use only
- No authentication mechanisms
- Use secure transport if exposing over network

## Security Updates

Security updates will be:
- Released as patch versions (1.x.y)
- Documented in [CHANGELOG.md](./CHANGELOG.md)
- Announced in release notes
- Backward compatible when possible

## Responsible Disclosure

We appreciate security researchers who:
- Report vulnerabilities privately first
- Allow reasonable time for fixes
- Avoid accessing user data without permission
- Follow coordinated disclosure practices

Thank you for helping keep Simple Memory MCP Server secure! 🛡️