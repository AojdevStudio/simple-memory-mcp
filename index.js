#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListPromptsRequestSchema,
  ListResourcesRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import fs from 'fs/promises';
import path from 'path';
import { ObsidianConverter } from './scripts/obsidian-converter.js';

const MEMORY_PATH = process.env.MEMORY_PATH ? path.join(process.env.MEMORY_PATH, 'memory.json') : path.join(process.env.HOME, '.cursor', 'memory.json');

console.error(`Memory server starting, will save to: ${MEMORY_PATH}`);

class SimpleMemoryServer {
  constructor() {
    this.entities = new Map();
    this.relations = [];
    this.loadMemory();
  }

  async loadMemory() {
    try {
      const data = await fs.readFile(MEMORY_PATH, 'utf8');
      const parsed = JSON.parse(data);
      
      if (parsed.entities) {
        parsed.entities.forEach(entity => {
          this.entities.set(entity.name, entity);
        });
      }
      
      if (parsed.relations) {
        this.relations = parsed.relations;
      }
      
      console.error(`Loaded memory: ${this.entities.size} entities, ${this.relations.length} relations`);
    } catch (error) {
      console.error(`Starting fresh - no existing memory file found`);
    }
  }

  async saveMemory() {
    try {
      const data = {
        entities: Array.from(this.entities.values()),
        relations: this.relations
      };
      
      await fs.mkdir(path.dirname(MEMORY_PATH), { recursive: true });
      await fs.writeFile(MEMORY_PATH, JSON.stringify(data, null, 2));
      console.error(`Saved memory to ${MEMORY_PATH}`);
    } catch (error) {
      console.error(`Error saving memory: ${error.message}`);
    }
  }

  async createEntities(entities) {
    entities.forEach(entity => {
      this.entities.set(entity.name, {
        name: entity.name,
        entityType: entity.entityType,
        observations: entity.observations || []
      });
    });
    await this.saveMemory();
    
    // Optional auto-export to Obsidian
    if (process.env.OBSIDIAN_AUTO_EXPORT === 'true' && process.env.OBSIDIAN_VAULT_PATH) {
      try {
        await this.exportToObsidian(
          process.env.OBSIDIAN_VAULT_PATH,
          process.env.OBSIDIAN_EXPORT_FORMAT || 'markdown'
        );
        console.error(`Auto-exported to Obsidian: ${process.env.OBSIDIAN_VAULT_PATH}`);
      } catch (error) {
        console.error(`Auto-export failed: ${error.message}`);
      }
    }
    
    return Array.from(this.entities.values()).filter(e => entities.some(input => input.name === e.name));
  }

  createRelations(relations) {
    relations.forEach(relation => {
      this.relations.push({
        from: relation.from,
        to: relation.to,
        relationType: relation.relationType
      });
    });
    this.saveMemory();
    return relations;
  }

  addObservations(observations) {
    observations.forEach(obs => {
      const entity = this.entities.get(obs.entityName);
      if (entity) {
        entity.observations.push(...obs.contents);
      }
    });
    this.saveMemory();
    return observations;
  }

  deleteEntities(entityNames) {
    const deleted = [];
    entityNames.forEach(name => {
      if (this.entities.has(name)) {
        deleted.push(this.entities.get(name));
        this.entities.delete(name);
        // Remove relations involving this entity
        this.relations = this.relations.filter(rel => 
          rel.from !== name && rel.to !== name
        );
      }
    });
    this.saveMemory();
    return deleted;
  }

  deleteObservations(deletions) {
    deletions.forEach(deletion => {
      const entity = this.entities.get(deletion.entityName);
      if (entity) {
        deletion.observations.forEach(obsToDelete => {
          const index = entity.observations.indexOf(obsToDelete);
          if (index > -1) {
            entity.observations.splice(index, 1);
          }
        });
      }
    });
    this.saveMemory();
    return deletions;
  }

  deleteRelations(relations) {
    const deleted = [];
    relations.forEach(relation => {
      const index = this.relations.findIndex(rel => 
        rel.from === relation.from && 
        rel.to === relation.to && 
        rel.relationType === relation.relationType
      );
      if (index > -1) {
        deleted.push(this.relations[index]);
        this.relations.splice(index, 1);
      }
    });
    this.saveMemory();
    return deleted;
  }

  searchNodes(query) {
    const results = [];
    this.entities.forEach(entity => {
      const searchText = `${entity.name} ${entity.entityType} ${entity.observations.join(' ')}`.toLowerCase();
      if (searchText.includes(query.toLowerCase())) {
        results.push(entity);
      }
    });
    return results;
  }

  openNodes(names) {
    return names.map(name => this.entities.get(name)).filter(entity => entity);
  }

  readGraph() {
    return {
      entities: Array.from(this.entities.values()),
      relations: this.relations
    };
  }

  async exportToObsidian(vaultPath, format = 'markdown', autoIndex = true) {
    try {
      const converter = new ObsidianConverter(MEMORY_PATH, vaultPath);
      
      switch (format) {
        case 'markdown':
          await converter.convertToMarkdownFiles(vaultPath);
          break;
        case 'dataview':
          await converter.convertToDataview(vaultPath);
          break;
        case 'canvas':
          await converter.convertToCanvas(vaultPath);
          break;
        case 'all':
          await converter.convertToMarkdownFiles(vaultPath);
          await converter.convertToDataview(path.join(vaultPath, 'Analytics'));
          await converter.convertToCanvas(path.join(vaultPath, 'Visual'));
          break;
        default:
          throw new Error(`Unknown format: ${format}`);
      }
      
      return {
        success: true,
        vaultPath,
        format,
        entityCount: this.entities.size,
        relationCount: this.relations.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Obsidian export failed: ${error.message}`);
    }
  }
}

const server = new Server(
  {
    name: 'simple-memory-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      prompts: {},
      resources: {},
    },
  }
);

const memoryServer = new SimpleMemoryServer();

// Register tools/list handler
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "create_entities",
        description: "Create multiple new entities in the knowledge graph",
        inputSchema: {
          type: "object",
          properties: {
            entities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string", description: "The name of the entity" },
                  entityType: { type: "string", description: "The type of the entity" },
                  observations: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "An array of observation contents associated with the entity"
                  }
                },
                required: ["name", "entityType", "observations"]
              }
            }
          },
          required: ["entities"]
        }
      },
      {
        name: "create_relations",
        description: "Create multiple new relations between entities in the knowledge graph. Relations should be in active voice",
        inputSchema: {
          type: "object",
          properties: {
            relations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  from: { type: "string", description: "The name of the entity where the relation starts" },
                  to: { type: "string", description: "The name of the entity where the relation ends" },
                  relationType: { type: "string", description: "The type of the relation" }
                },
                required: ["from", "to", "relationType"]
              }
            }
          },
          required: ["relations"]
        }
      },
      {
        name: "add_observations",
        description: "Add new observations to existing entities in the knowledge graph",
        inputSchema: {
          type: "object",
          properties: {
            observations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  entityName: { type: "string", description: "The name of the entity to add the observations to" },
                  contents: { 
                    type: "array", 
                    items: { type: "string" },
                    description: "An array of observation contents to add"
                  }
                },
                required: ["entityName", "contents"]
              }
            }
          },
          required: ["observations"]
        }
      },
      {
        name: "delete_entities",
        description: "Delete multiple entities and their associated relations from the knowledge graph",
        inputSchema: {
          type: "object",
          properties: {
            entityNames: {
              type: "array",
              items: { type: "string" },
              description: "An array of entity names to delete"
            }
          },
          required: ["entityNames"]
        }
      },
      {
        name: "delete_observations",
        description: "Delete specific observations from entities in the knowledge graph",
        inputSchema: {
          type: "object",
          properties: {
            deletions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  entityName: { type: "string", description: "The name of the entity containing the observations" },
                  observations: {
                    type: "array",
                    items: { type: "string" },
                    description: "An array of observations to delete"
                  }
                },
                required: ["entityName", "observations"]
              }
            }
          },
          required: ["deletions"]
        }
      },
      {
        name: "delete_relations",
        description: "Delete multiple relations from the knowledge graph",
        inputSchema: {
          type: "object",
          properties: {
            relations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  from: { type: "string", description: "The name of the entity where the relation starts" },
                  to: { type: "string", description: "The name of the entity where the relation ends" },
                  relationType: { type: "string", description: "The type of the relation" }
                },
                required: ["from", "to", "relationType"]
              },
              description: "An array of relations to delete"
            }
          },
          required: ["relations"]
        }
      },
      {
        name: "read_graph",
        description: "Read the entire knowledge graph",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "search_nodes",
        description: "Search for nodes in the knowledge graph based on a query",
        inputSchema: {
          type: "object",
          properties: {
            query: {
              type: "string",
              description: "The search query to match against entity names, types, and observation content"
            }
          },
          required: ["query"]
        }
      },
      {
        name: "open_nodes",
        description: "Open specific nodes in the knowledge graph by their names",
        inputSchema: {
          type: "object",
          properties: {
            names: {
              type: "array",
              items: { type: "string" },
              description: "An array of entity names to retrieve"
            }
          },
          required: ["names"]
        }
      },
      {
        name: "export_to_obsidian",
        description: "Export the knowledge graph to Obsidian vault in various formats",
        inputSchema: {
          type: "object",
          properties: {
            vaultPath: {
              type: "string",
              description: "The path to the Obsidian vault directory"
            },
            format: {
              type: "string",
              enum: ["markdown", "dataview", "canvas", "all"],
              description: "The export format - markdown (individual files), dataview (business intelligence), canvas (visual network), or all formats",
              default: "markdown"
            },
            autoIndex: {
              type: "boolean",
              description: "Whether to automatically create index files",
              default: true
            }
          },
          required: ["vaultPath"]
        }
      }
    ]
  };
});

// Register prompts/list handler
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return { prompts: [] };
});

// Register resources/list handler
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return { resources: [] };
});

// Register tools/call handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  try {
    switch (name) {
      case "create_entities":
        const result = await memoryServer.createEntities(args.entities);
        return { content: [{ type: "text", text: JSON.stringify(result) }] };
      case "create_relations":
        const relations = memoryServer.createRelations(args.relations);
        return { content: [{ type: "text", text: JSON.stringify(relations) }] };
      case "add_observations":
        const observations = memoryServer.addObservations(args.observations);
        return { content: [{ type: "text", text: JSON.stringify(observations) }] };
      case "delete_entities":
        const deleted = memoryServer.deleteEntities(args.entityNames);
        return { content: [{ type: "text", text: JSON.stringify(deleted) }] };
      case "delete_observations":
        const deletedObs = memoryServer.deleteObservations(args.deletions);
        return { content: [{ type: "text", text: JSON.stringify(deletedObs) }] };
      case "delete_relations":
        const deletedRels = memoryServer.deleteRelations(args.relations);
        return { content: [{ type: "text", text: JSON.stringify(deletedRels) }] };
      case "read_graph":
        const graph = memoryServer.readGraph();
        return { content: [{ type: "text", text: JSON.stringify(graph) }] };
      case "search_nodes":
        const searchResults = memoryServer.searchNodes(args.query);
        return { content: [{ type: "text", text: JSON.stringify(searchResults) }] };
      case "open_nodes":
        const nodes = memoryServer.openNodes(args.names);
        return { content: [{ type: "text", text: JSON.stringify(nodes) }] };
      case "export_to_obsidian":
        const exportResult = await memoryServer.exportToObsidian(
          args.vaultPath, 
          args.format || 'markdown', 
          args.autoIndex !== false
        );
        return { content: [{ type: "text", text: JSON.stringify(exportResult) }] };
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{ type: "text", text: JSON.stringify({ error: error.message }) }],
      isError: true
    };
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Simple Memory MCP Server running and ready!");
}

main().catch(console.error);
