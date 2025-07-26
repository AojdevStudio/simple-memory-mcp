# MCP Built-in Export Implementation Guide

## 🎯 Overview

This document outlines implementing **built-in Obsidian export** as native MCP tools within the Simple Memory Server, eliminating resource-intensive file watching and providing event-driven synchronization.

## 🏗️ Implementation Architecture

### Core Design Principles
1. **Event-Driven**: Export triggers on actual data changes, not file watching
2. **Zero Background Processes**: No continuous monitoring
3. **Environment-Controlled**: Optional via environment variables
4. **Multiple Formats**: Support markdown, dataview, canvas, and mindmap formats
5. **Atomic Operations**: Safe file operations with error handling

### MCP Tools Structure

```javascript
// New MCP Tools to Add
const EXPORT_TOOLS = {
  export_to_obsidian: {
    name: "export_to_obsidian",
    description: "Export knowledge graph to Obsidian vault in various formats",
    inputSchema: {
      type: "object",
      properties: {
        vault_path: { 
          type: "string", 
          description: "Absolute path to Obsidian vault directory" 
        },
        format: { 
          type: "string", 
          enum: ["markdown", "dataview", "canvas", "mindmap", "all"],
          default: "markdown",
          description: "Export format type"
        },
        folder_name: { 
          type: "string", 
          default: "Knowledge Graph",
          description: "Folder name within vault for exported content"
        },
        auto_index: { 
          type: "boolean", 
          default: true,
          description: "Generate index/dashboard files"
        }
      },
      required: ["vault_path"]
    }
  },
  
  export_mindmap: {
    name: "export_mindmap",
    description: "Export knowledge graph as interactive mindmap for Obsidian",
    inputSchema: {
      type: "object",
      properties: {
        vault_path: { type: "string" },
        center_entity: { 
          type: "string",
          description: "Entity to use as mindmap center (defaults to most connected)"
        },
        max_depth: { 
          type: "number", 
          default: 3,
          description: "Maximum relationship depth to include"
        },
        include_observations: { 
          type: "boolean", 
          default: true,
          description: "Include entity observations in mindmap nodes"
        }
      },
      required: ["vault_path"]
    }
  }
};
```

## 🔧 Implementation Details

### 1. Enhanced SimpleMemoryServer Class

```javascript
// Add to SimpleMemoryServer class
class SimpleMemoryServer {
  constructor() {
    // ... existing constructor
    this.obsidianExporter = null;
  }

  async initializeExporter() {
    // Lazy-load obsidian converter
    const { ObsidianConverter } = await import('./obsidian-converter.js');
    this.obsidianExporter = new ObsidianConverter(MEMORY_PATH);
  }

  // Hook into existing data modification methods
  async create_entities(entities) {
    const result = await this.processEntities(entities);
    await this.saveMemory();
    
    // Auto-export if configured
    await this.triggerObsidianExport();
    
    return result;
  }

  async update_entity(entityName, newObservations) {
    // ... existing logic
    await this.saveMemory();
    await this.triggerObsidianExport();
    // ... return result
  }

  async triggerObsidianExport() {
    if (process.env.OBSIDIAN_AUTO_EXPORT !== 'true') return;
    
    const vaultPath = process.env.OBSIDIAN_VAULT_PATH;
    const format = process.env.OBSIDIAN_EXPORT_FORMAT || 'markdown';
    
    if (vaultPath) {
      try {
        await this.exportToObsidian(vaultPath, format);
        console.log(`✅ Auto-exported to Obsidian: ${format}`);
      } catch (error) {
        console.error(`❌ Auto-export failed:`, error.message);
      }
    }
  }

  async exportToObsidian(vaultPath, format = 'markdown', folderName = 'Knowledge Graph') {
    if (!this.obsidianExporter) {
      await this.initializeExporter();
    }

    const outputDir = path.join(vaultPath, folderName);
    
    switch (format) {
      case 'markdown':
        await this.obsidianExporter.convertToMarkdownFiles(outputDir);
        break;
      case 'dataview':
        await this.obsidianExporter.convertToDataview(outputDir);
        break;
      case 'canvas':
        await this.obsidianExporter.convertToCanvas(outputDir);
        break;
      case 'mindmap':
        await this.exportMindmap(outputDir);
        break;
      case 'all':
        await this.obsidianExporter.convertToMarkdownFiles(outputDir);
        await this.obsidianExporter.convertToDataview(path.join(outputDir, 'Analytics'));
        await this.obsidianExporter.convertToCanvas(path.join(outputDir, 'Visual'));
        await this.exportMindmap(path.join(outputDir, 'Mindmap'));
        break;
      default:
        throw new Error(`Unknown format: ${format}`);
    }
  }

  async exportMindmap(outputDir, centerEntity = null, maxDepth = 3) {
    const memory = await this.loadMemory();
    
    // Generate mindmap structure optimized for your business data
    const mindmapData = this.generateMindmapStructure(memory, centerEntity, maxDepth);
    
    // Create Obsidian-compatible mindmap file
    const mindmapContent = this.generateObsidianMindmap(mindmapData);
    
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(
      path.join(outputDir, 'Business Knowledge Mindmap.md'), 
      mindmapContent, 
      'utf8'
    );
  }

  generateMindmapStructure(memory, centerEntity, maxDepth) {
    // For your KPI-focused data, use business-centric organization
    const entities = memory.entities;
    const relations = memory.relations;
    
    // If no center specified, use the entity with most observations or connections
    if (!centerEntity) {
      centerEntity = entities.reduce((prev, current) => 
        (prev.observations.length > current.observations.length) ? prev : current
      ).name;
    }

    // Build mindmap hierarchy based on entity types and relationships
    const mindmap = {
      center: centerEntity,
      branches: this.buildMindmapBranches(entities, relations, centerEntity, maxDepth)
    };

    return mindmap;
  }

  buildMindmapBranches(entities, relations, centerEntity, maxDepth) {
    const branches = {
      people: [],
      processes: [],
      folders: [],
      systems: []
    };

    entities.forEach(entity => {
      if (entity.name === centerEntity) return;

      const branch = {
        name: entity.name,
        type: entity.entityType,
        observations: entity.observations.slice(0, 3), // Limit for mindmap clarity
        connections: relations.filter(rel => 
          rel.from === entity.name || rel.to === entity.name
        ).length
      };

      // Categorize by entity type for business clarity
      switch (entity.entityType) {
        case 'person':
          branches.people.push(branch);
          break;
        case 'kip_process':
          branches.processes.push(branch);
          break;
        case 'drive_folder':
          branches.folders.push(branch);
          break;
        default:
          branches.systems.push(branch);
      }
    });

    return branches;
  }

  generateObsidianMindmap(mindmapData) {
    // Generate Markmap-compatible markdown for Obsidian
    let content = `# Business Knowledge Mindmap\n\n`;
    content += `*Generated from MCP Memory Server*\n\n`;
    content += `\`\`\`markmap\n`;
    content += `# ${mindmapData.center}\n\n`;

    // Add branches organized by business function
    const branches = mindmapData.branches;

    if (branches.people.length > 0) {
      content += `## 👥 People\n\n`;
      branches.people.forEach(person => {
        content += `### ${person.name}\n`;
        person.observations.forEach(obs => {
          content += `- ${obs.substring(0, 50)}${obs.length > 50 ? '...' : ''}\n`;
        });
        content += `\n`;
      });
    }

    if (branches.processes.length > 0) {
      content += `## 🎯 KPI Processes\n\n`;
      branches.processes.forEach(process => {
        content += `### ${process.name}\n`;
        process.observations.forEach(obs => {
          content += `- ${obs.substring(0, 50)}${obs.length > 50 ? '...' : ''}\n`;
        });
        content += `\n`;
      });
    }

    if (branches.folders.length > 0) {
      content += `## 📁 Drive Folders\n\n`;
      branches.folders.forEach(folder => {
        content += `### ${folder.name}\n`;
        folder.observations.forEach(obs => {
          content += `- ${obs.substring(0, 50)}${obs.length > 50 ? '...' : ''}\n`;
        });
        content += `\n`;
      });
    }

    if (branches.systems.length > 0) {
      content += `## ⚙️ Systems\n\n`;
      branches.systems.forEach(system => {
        content += `### ${system.name}\n`;
        system.observations.forEach(obs => {
          content += `- ${obs.substring(0, 50)}${obs.length > 50 ? '...' : ''}\n`;
        });
        content += `\n`;
      });
    }

    content += `\`\`\`\n\n`;
    content += `---\n`;
    content += `*To view as interactive mindmap, install the Markmap plugin in Obsidian*\n`;

    return content;
  }
}
```

### 2. MCP Tool Registration

```javascript
// Add to existing MCP tool handlers
async handleToolCall(request) {
  const { name, arguments: args } = request.params;
  
  switch (name) {
    // ... existing cases
    
    case 'export_to_obsidian':
      return await this.exportToObsidianTool(args);
      
    case 'export_mindmap':
      return await this.exportMindmapTool(args);
      
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async exportToObsidianTool(args) {
  const { vault_path, format = 'markdown', folder_name = 'Knowledge Graph', auto_index = true } = args;
  
  try {
    await this.exportToObsidian(vault_path, format, folder_name);
    
    const memory = await this.loadMemory();
    return {
      content: [{
        type: "text",
        text: `✅ Successfully exported ${memory.entities.length} entities to Obsidian vault at ${vault_path}/${folder_name} in ${format} format`
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: "text", 
        text: `❌ Export failed: ${error.message}`
      }]
    };
  }
}

async exportMindmapTool(args) {
  const { vault_path, center_entity, max_depth = 3, include_observations = true } = args;
  
  try {
    const outputDir = path.join(vault_path, 'Knowledge Graph', 'Mindmap');
    await this.exportMindmap(outputDir, center_entity, max_depth);
    
    return {
      content: [{
        type: "text",
        text: `✅ Generated interactive mindmap at ${outputDir}/Business Knowledge Mindmap.md. Install Markmap plugin in Obsidian to view as interactive mindmap.`
      }]
    };
  } catch (error) {
    return {
      content: [{
        type: "text",
        text: `❌ Mindmap export failed: ${error.message}`
      }]
    };
  }
}
```

### 3. Environment Configuration

```bash
# .env file or environment variables
OBSIDIAN_AUTO_EXPORT=true
OBSIDIAN_VAULT_PATH="/Users/ossieirondi/Projects/dev-utils/.obsidian"
OBSIDIAN_EXPORT_FORMAT="markdown"
OBSIDIAN_FOLDER_NAME="Knowledge Graph"
```

### 4. Remove Auto-Watch Implementation

```javascript
// Remove from obsidian-converter.js
// DELETE: watchAndUpdate method
// DELETE: fs.watch usage
// DELETE: --watch CLI argument handling

// Update CLI interface
async function main() {
  const args = process.argv.slice(2);
  const memoryPath = args[0] || '/Users/ossieirondi/Projects/dev-utils/.obsidian/memories/memory.json';
  const outputDir = args[1] || '/Users/ossieirondi/Projects/dev-utils/.obsidian/Knowledge Graph';
  const format = args[2] || 'markdown';
  
  // Remove watch flag support
  // const watch = args.includes('--watch'); // DELETE THIS
  
  console.log(`🧠 MCP Memory to Obsidian Converter`);
  console.log(`📁 Memory file: ${memoryPath}`);
  console.log(`📂 Output directory: ${outputDir}`);
  console.log(`🎨 Format: ${format}`);
  
  const converter = new ObsidianConverter(memoryPath, outputDir);
  
  try {
    // ... existing conversion logic
    
    // Remove watch functionality
    // if (watch) {
    //   await converter.watchAndUpdate(outputDir, format); // DELETE THIS
    // }
    
  } catch (error) {
    console.error(`❌ Conversion failed:`, error.message);
    process.exit(1);
  }
}
```

## 🎨 Mindmap Integration for Business Data

### Obsidian Mindmap Options

**Option 1: Markmap Plugin (Recommended)**
- Install [Obsidian Markmap](https://github.com/martinohanlon/obsidian-markmap) plugin
- Creates interactive mindmaps from Markdown
- Supports your business hierarchy structure
- Real-time updates when memory changes

**Option 2: Canvas-based Mindmap**
- Uses native Obsidian Canvas
- Visual node-based representation  
- Manual positioning but full customization
- Better for static business overviews

**Option 3: Excalidraw Integration**
- Install Excalidraw plugin
- Hand-drawn style mindmaps
- Great for presentations and planning
- Combines with your KPI data

### Business-Optimized Mindmap Structure

For your KamDental data, the mindmap will organize as:

```
🏢 Ossie Irondi (CEO/COO)
├── 👥 People
├── 🎯 KPI Processes
│   ├── Daily Reports
│   │   ├── Critical daily requirement
│   │   ├── Google Sheets integration
│   │   └── Production tracking
│   └── Daily Payment Reporting
│       ├── Payment tracking
│       ├── Daily requirements
│       └── Financial oversight
├── 📁 Drive Folders
│   └── KPI & Reports Folder
│       ├── Production trackers
│       ├── Morning huddle materials
│       └── Daily reporting systems
└── ⚙️ Systems & Tools
    └── Google Drive Integration
```

## 🚀 Implementation Timeline

**Phase 1 (This Week):**
1. Remove auto-watch from obsidian-converter.js ✅
2. Add MCP export tools to SimpleMemoryServer
3. Implement environment-based auto-export
4. Test with your existing memory.json data

**Phase 2 (Next Week):**  
1. Add mindmap export functionality
2. Integrate with Markmap for interactive visualization
3. Create business-optimized mindmap templates
4. Add error handling and recovery

**Phase 3 (Following Week):**
1. Performance optimization for large datasets
2. Incremental sync (only changed entities)  
3. Advanced mindmap features (filtering, depth control)
4. Integration testing with Obsidian plugins

## 📊 Usage Examples

```bash
# Via MCP Client (like Cursor/Claude)
# Call tool: export_to_obsidian
{
  "vault_path": "/Users/ossieirondi/Projects/dev-utils/.obsidian",
  "format": "mindmap",
  "folder_name": "Business Intelligence"
}

# Via Environment Auto-Export
export OBSIDIAN_AUTO_EXPORT=true
export OBSIDIAN_VAULT_PATH="/Users/ossieirondi/Projects/dev-utils/.obsidian"
export OBSIDIAN_EXPORT_FORMAT="all"

# Then any MCP operation automatically updates Obsidian
```

## 🎯 Benefits of This Approach

1. **Zero Resource Waste**: No background processes or file watching
2. **Event-Driven**: Updates only when data actually changes
3. **Business-Focused**: Mindmaps organized for KPI/business intelligence
4. **Native Integration**: Works with any MCP client
5. **Multiple Formats**: Choose the best visualization for each use case
6. **Scalable**: Handles growing datasets efficiently

This implementation gives you the professional mindmap visualization you want while eliminating the resource problems with file watching! 🎊