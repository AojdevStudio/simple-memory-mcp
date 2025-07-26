#!/usr/bin/env node

/**
 * MCP Memory to Obsidian Converter
 * Converts memory.json to various Obsidian formats
 */

import fs from 'fs/promises';
import path from 'path';

class ObsidianConverter {
  constructor(memoryPath, obsidianPath) {
    this.memoryPath = memoryPath;
    this.obsidianPath = obsidianPath;
  }

  async loadMemory() {
    const data = await fs.readFile(this.memoryPath, 'utf8');
    return JSON.parse(data);
  }

  // Option 1: Convert to individual Markdown files
  async convertToMarkdownFiles(outputDir) {
    const memory = await this.loadMemory();
    const entitiesDir = path.join(outputDir, 'Entities');
    
    await fs.mkdir(entitiesDir, { recursive: true });

    for (const entity of memory.entities) {
      const fileName = this.sanitizeFileName(entity.name) + '.md';
      const filePath = path.join(entitiesDir, fileName);
      
      const content = this.generateMarkdownContent(entity, memory.relations);
      await fs.writeFile(filePath, content, 'utf8');
    }

    // Create index file
    const indexContent = this.generateIndexFile(memory);
    await fs.writeFile(path.join(outputDir, 'Knowledge Graph Index.md'), indexContent, 'utf8');

    console.log(`✅ Converted ${memory.entities.length} entities to Markdown files`);
  }

  // Option 2: Create Dataview-compatible structure
  async convertToDataview(outputDir) {
    const memory = await this.loadMemory();
    const dataDir = path.join(outputDir, 'Insights');
    
    await fs.mkdir(dataDir, { recursive: true });

    for (const entity of memory.entities) {
      const fileName = this.sanitizeFileName(entity.name) + '.md';
      const filePath = path.join(dataDir, fileName);
      
      const content = this.generateDataviewContent(entity, memory.relations);
      await fs.writeFile(filePath, content, 'utf8');
    }

    // Create query templates
    const queriesContent = this.generateDataviewQueries();
    await fs.writeFile(path.join(outputDir, 'Business Intelligence.md'), queriesContent, 'utf8');

    console.log(`✅ Created Dataview structure with ${memory.entities.length} entities`);
  }

  // Option 3: Canvas format for visual layout
  async convertToCanvas(outputDir) {
    const memory = await this.loadMemory();
    
    const canvasData = {
      nodes: [],
      edges: []
    };

    // Create nodes for entities
    memory.entities.forEach((entity, index) => {
      const node = {
        id: entity.name,
        type: "text",
        text: this.generateCanvasNodeText(entity),
        x: (index % 4) * 300,
        y: Math.floor(index / 4) * 200,
        width: 250,
        height: 150,
        color: this.getEntityColor(entity.entityType)
      };
      canvasData.nodes.push(node);
    });

    // Create edges for relations
    memory.relations.forEach(relation => {
      const edge = {
        id: `${relation.from}-${relation.to}`,
        fromNode: relation.from,
        toNode: relation.to,
        label: relation.relationType
      };
      canvasData.edges.push(edge);
    });

    const canvasPath = path.join(outputDir, 'Entity Network.canvas');
    await fs.writeFile(canvasPath, JSON.stringify(canvasData, null, 2), 'utf8');

    console.log(`✅ Created Canvas file with ${canvasData.nodes.length} nodes and ${canvasData.edges.length} edges`);
  }

  // Helper methods
  sanitizeFileName(name) {
    return name.replace(/[<>:"/\\|?*]/g, '-').replace(/\s+/g, ' ').trim();
  }

  generateMarkdownContent(entity, relations) {
    let content = `# ${entity.name}\n\n`;
    
    // Add metadata
    content += `**Type:** ${entity.entityType}\n`;
    content += `**Created:** ${new Date().toISOString().split('T')[0]}\n\n`;
    
    // Add observations
    content += `## Observations\n\n`;
    entity.observations.forEach(obs => {
      content += `- ${obs}\n`;
    });
    
    // Add relationships
    const entityRelations = relations.filter(rel => 
      rel.from === entity.name || rel.to === entity.name
    );
    
    if (entityRelations.length > 0) {
      content += `\n## Relationships\n\n`;
      entityRelations.forEach(rel => {
        if (rel.from === entity.name) {
          content += `- **${rel.relationType}** → [[${rel.to}]]\n`;
        } else {
          content += `- **${rel.relationType}** ← [[${rel.from}]]\n`;
        }
      });
    }
    
    // Add tags
    content += `\n---\n`;
    content += `Tags: #${entity.entityType.replace(/\s+/g, '-')} #memory-entity\n`;
    
    return content;
  }

  generateDataviewContent(entity, relations) {
    let content = `# ${entity.name}\n\n`;
    
    // Dataview metadata
    content += `---\n`;
    content += `entity_name: "${entity.name}"\n`;
    content += `entity_type: "${entity.entityType}"\n`;
    content += `observation_count: ${entity.observations.length}\n`;
    content += `tags:\n`;
    content += `  - ${entity.entityType.replace(/\s+/g, '-')}\n`;
    content += `  - memory-entity\n`;
    content += `---\n\n`;
    
    // Content
    content += `## Overview\n\n`;
    content += `**Entity Type:** \`${entity.entityType}\`\n\n`;
    
    content += `## Observations\n\n`;
    entity.observations.forEach((obs, index) => {
      content += `${index + 1}. ${obs}\n`;
    });
    
    // Relations query
    content += `\n## Related Entities\n\n`;
    content += '```dataview\n';
    content += 'TABLE entity_type as "Type", observation_count as "Observations"\n';
    content += `FROM #memory-entity\n`;
    content += `WHERE contains(file.name, "${entity.name}") = false\n`;
    content += 'SORT entity_type, file.name\n';
    content += '```\n';
    
    return content;
  }

  generateCanvasNodeText(entity) {
    let text = `**${entity.name}**\n`;
    text += `*${entity.entityType}*\n\n`;
    
    const maxObs = 3;
    const displayObs = entity.observations.slice(0, maxObs);
    displayObs.forEach(obs => {
      const shortObs = obs.length > 50 ? obs.substring(0, 47) + '...' : obs;
      text += `• ${shortObs}\n`;
    });
    
    if (entity.observations.length > maxObs) {
      text += `... and ${entity.observations.length - maxObs} more`;
    }
    
    return text;
  }

  getEntityColor(entityType) {
    const colors = {
      'person': '#4CAF50',
      'organization': '#2196F3', 
      'drive_folder': '#FF9800',
      'kpi_process': '#9C27B0',
      'test': '#607D8B',
      'default': '#757575'
    };
    return colors[entityType] || colors.default;
  }

  generateIndexFile(memory) {
    let content = `# Knowledge Graph Index\n\n`;
    content += `*Generated from MCP Server - Your Business Intelligence Hub*\n\n`;
    
    content += `## Statistics\n\n`;
    content += `- **Total Entities:** ${memory.entities.length}\n`;
    content += `- **Total Relations:** ${memory.relations.length}\n`;
    content += `- **Last Updated:** ${new Date().toISOString()}\n\n`;
    
    // Group by entity type
    const entityTypes = {};
    memory.entities.forEach(entity => {
      if (!entityTypes[entity.entityType]) {
        entityTypes[entity.entityType] = [];
      }
      entityTypes[entity.entityType].push(entity);
    });
    
    content += `## Entities by Type\n\n`;
    Object.entries(entityTypes).forEach(([type, entities]) => {
      content += `### ${type} (${entities.length})\n\n`;
      entities.forEach(entity => {
        content += `- [[${entity.name}]]\n`;
      });
      content += `\n`;
    });
    
    if (memory.relations.length > 0) {
      content += `## Relationships\n\n`;
      memory.relations.forEach(rel => {
        content += `- [[${rel.from}]] **${rel.relationType}** [[${rel.to}]]\n`;
      });
    }
    
    return content;
  }

  generateDataviewQueries() {
    let content = `# Business Intelligence Dashboard\n\n`;
    content += `*Dynamic queries for analyzing your business knowledge graph*\n\n`;
    
    content += `## All Entities by Type\n\n`;
    content += '```dataview\n';
    content += 'TABLE entity_name as "Name", observation_count as "Observations"\n';
    content += 'FROM #memory-entity\n';
    content += 'SORT entity_type, entity_name\n';
    content += 'GROUP BY entity_type\n';
    content += '```\n\n';
    
    content += `## Entities with Most Observations\n\n`;
    content += '```dataview\n';
    content += 'TABLE entity_type as "Type", observation_count as "Observations"\n';
    content += 'FROM #memory-entity\n';
    content += 'SORT observation_count DESC\n';
    content += 'LIMIT 10\n';
    content += '```\n\n';
    
    content += `## Recent Entities\n\n`;
    content += '```dataview\n';
    content += 'TABLE entity_type as "Type", file.ctime as "Created"\n';
    content += 'FROM #memory-entity\n';
    content += 'SORT file.ctime DESC\n';
    content += 'LIMIT 5\n';
    content += '```\n\n';
    
    return content;
  }

  // DEPRECATED: Use MCP server built-in export instead
  // See MCP_BUILTIN_IMPLEMENTATION.md for new approach
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const memoryPath = args[0] || '/Users/ossieirondi/Projects/dev-utils/.obsidian/memories/memory.json';
  const outputDir = args[1] || '/Users/ossieirondi/Projects/dev-utils/.obsidian/Knowledge Graph';
  const format = args[2] || 'markdown';
  // REMOVED: --watch flag support (see MCP_BUILTIN_IMPLEMENTATION.md)
  
  console.log(`🧠 MCP Memory to Obsidian Converter`);
  console.log(`📁 Memory file: ${memoryPath}`);
  console.log(`📂 Output directory: ${outputDir}`);
  console.log(`🎨 Format: ${format}`);
  
  const converter = new ObsidianConverter(memoryPath, outputDir);
  
  try {
    switch (format) {
      case 'markdown':
        await converter.convertToMarkdownFiles(outputDir);
        break;
      case 'dataview':
        await converter.convertToDataview(outputDir);
        break;
      case 'canvas':
        await converter.convertToCanvas(outputDir);
        break;
      case 'all':
        await converter.convertToMarkdownFiles(outputDir);
        await converter.convertToDataview(outputDir + '/Analytics');
        await converter.convertToCanvas(outputDir + '/Visual');
        break;
      default:
        console.error(`❌ Unknown format: ${format}`);
        process.exit(1);
    }
    
    // REMOVED: Auto-watch functionality
    // Use MCP server export_to_obsidian tool for event-driven updates
    
  } catch (error) {
    console.error(`❌ Conversion failed:`, error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { ObsidianConverter };