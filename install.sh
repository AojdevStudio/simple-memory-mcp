#!/bin/bash

# Simple Memory MCP Server - Interactive Installation Script
# Usage: curl -fsSL https://raw.githubusercontent.com/your-username/simple-memory-mcp/main/install.sh | bash

set -e

echo "🧠 Simple Memory MCP Server - Interactive Installation"
echo "===================================================="
echo ""

# Check Node.js version
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required but not installed."
    echo "Please install Node.js v18+ from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js v18+ is required. Current version: $(node --version)"
    echo "Please upgrade Node.js from https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js $(node --version) detected"

# Check for git
if ! command -v git &> /dev/null; then
    echo "❌ Git is required but not installed."
    echo "Please install Git from https://git-scm.com/"
    exit 1
fi

echo "✅ Git detected"

# Create temporary directory
TEMP_DIR=$(mktemp -d)
echo "📁 Created temporary directory: $TEMP_DIR"

# Clone repository
echo ""
echo "📦 Downloading Simple Memory MCP Server..."
cd "$TEMP_DIR"

# Replace with your actual GitHub repository URL
REPO_URL="https://github.com/your-username/simple-memory-mcp.git"
git clone "$REPO_URL" simple-memory-mcp

cd simple-memory-mcp

# Install dependencies
echo ""
echo "📚 Installing dependencies..."
npm install

# Run interactive setup
echo ""
echo "🚀 Starting interactive setup..."
echo "You'll be prompted to configure memory storage and Obsidian integration."
echo ""

node setup-claude-server.js

# Cleanup
echo ""
echo "🧹 Cleaning up temporary files..."
cd /
rm -rf "$TEMP_DIR"

echo ""
echo "🎉 Installation complete!"
echo ""
echo "📖 What happens next:"
echo "  1. Restart Claude Desktop or Cursor"
echo "  2. Your MCP server is now configured with your preferences"
echo "  3. Use the MCP tools in your AI conversations"
echo ""
echo "💡 Configuration saved to ~/.simple-memory-mcp-config"
echo "   Run the setup again anytime to change your settings!"
echo ""
echo "📚 For documentation and support:"
echo "   https://github.com/your-username/simple-memory-mcp"
echo ""