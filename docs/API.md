# API Reference - Simple Memory MCP Server

Complete API documentation for the Simple Memory MCP Server, including detailed tool specifications, data schemas, and usage examples.

## 📋 Overview

The Simple Memory MCP Server provides 9 core tools for managing a persistent knowledge graph through the Model Context Protocol. All tools operate on entities (nodes) and relations (edges) with automatic JSON file persistence.

## 🛠 Tools Summary

| Tool Name | Purpose | Input Types | Output Types |
|-----------|---------|-------------|--------------|
| [`create_entities`](#create_entities) | Create new entities | `Entity[]` | `Entity[]` |
| [`create_relations`](#create_relations) | Create relationships | `Relation[]` | `Relation[]` |
| [`add_observations`](#add_observations) | Add entity observations | `Observation[]` | `Observation[]` |
| [`delete_entities`](#delete_entities) | Remove entities | `string[]` | `Entity[]` |
| [`delete_observations`](#delete_observations) | Remove observations | `Deletion[]` | `Deletion[]` |
| [`delete_relations`](#delete_relations) | Remove relationships | `Relation[]` | `Relation[]` |
| [`read_graph`](#read_graph) | Get complete graph | `{}` | `Graph` |
| [`search_nodes`](#search_nodes) | Search entities | `{query: string}` | `Entity[]` |
| [`open_nodes`](#open_nodes) | Get specific entities | `{names: string[]}` | `Entity[]` |

## 📊 Data Types

### Core Types

#### `Entity`
```typescript
interface Entity {
  name: string;           // Unique identifier (required)
  entityType: string;     // Classification type (required) 
  observations: string[]; // Array of text observations (required)
}
```

**Example:**
```json
{
  "name": "john-doe",
  "entityType": "person",
  "observations": [
    "Software engineer at TechCorp",
    "Specializes in full-stack development", 
    "Based in San Francisco"
  ]
}
```

#### `Relation`
```typescript
interface Relation {
  from: string;          // Source entity name (required)
  to: string;            // Target entity name (required)
  relationType: string;  // Relationship type (required)
}
```

**Example:**
```json
{
  "from": "john-doe",
  "to": "techcorp",
  "relationType": "works_for"
}
```

#### `Graph`
```typescript
interface Graph {
  entities: Entity[];    // All entities in the graph
  relations: Relation[]; // All relationships in the graph
}
```

### Input Types

#### `Observation`
```typescript
interface Observation {
  entityName: string;    // Target entity name (required)
  contents: string[];    // New observations to add (required)
}
```

#### `Deletion`  
```typescript
interface Deletion {
  entityName: string;      // Target entity name (required)
  observations: string[];  // Specific observations to remove (required)
}
```

## 🔧 Tool Details

### `create_entities`

Creates multiple new entities in the knowledge graph. If an entity with the same name already exists, it will be overwritten.

#### Input Schema
```json
{
  "type": "object",
  "properties": {
    "entities": {
      "type": "array",
      "items": {
        "type": "object", 
        "properties": {
          "name": {
            "type": "string",
            "description": "Unique identifier for the entity"
          },
          "entityType": {
            "type": "string", 
            "description": "Classification type (e.g., person, organization, concept)"
          },
          "observations": {
            "type": "array",
            "items": {"type": "string"},
            "description": "Array of observation texts about this entity"
          }
        },
        "required": ["name", "entityType", "observations"]
      }
    }
  },
  "required": ["entities"]
}
```

#### Example Request
```json
{
  "entities": [
    {
      "name": "alice-smith",
      "entityType": "person",
      "observations": [
        "Senior data scientist",
        "PhD in Machine Learning from Stanford",
        "Expert in NLP and computer vision",
        "Published 15+ research papers"
      ]
    },
    {
      "name": "ai-research-lab",
      "entityType": "organization", 
      "observations": [
        "Leading AI research institution",
        "Founded in 2020",
        "Focus on ethical AI development"
      ]
    }
  ]
}
```

#### Response
Returns array of successfully created entities:
```json
[
  {
    "name": "alice-smith", 
    "entityType": "person",
    "observations": [
      "Senior data scientist",
      "PhD in Machine Learning from Stanford", 
      "Expert in NLP and computer vision",
      "Published 15+ research papers"
    ]
  },
  {
    "name": "ai-research-lab",
    "entityType": "organization",
    "observations": [
      "Leading AI research institution",
      "Founded in 2020", 
      "Focus on ethical AI development"
    ]
  }
]
```

#### Behavior Notes
- **Overwrites**: Existing entities with the same name are replaced
- **Persistence**: Changes are automatically saved to disk
- **Validation**: All required fields must be provided
- **Performance**: Batch creation is more efficient than individual calls

---

### `create_relations`

Creates relationships between existing entities. Relations are directional from source to target entity.

#### Input Schema
```json
{
  "type": "object",
  "properties": {
    "relations": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "from": {
            "type": "string",
            "description": "Source entity name"
          },
          "to": {
            "type": "string", 
            "description": "Target entity name"
          },
          "relationType": {
            "type": "string",
            "description": "Type of relationship (e.g., works_for, knows, manages)"
          }
        },
        "required": ["from", "to", "relationType"]
      }
    }
  },
  "required": ["relations"]
}
```

#### Example Request
```json
{
  "relations": [
    {
      "from": "alice-smith",
      "to": "ai-research-lab", 
      "relationType": "works_for"
    },
    {
      "from": "alice-smith",
      "to": "john-doe",
      "relationType": "collaborates_with"
    }
  ]
}
```

#### Response
Returns array of successfully created relations:
```json
[
  {
    "from": "alice-smith",
    "to": "ai-research-lab",
    "relationType": "works_for"
  },
  {
    "from": "alice-smith", 
    "to": "john-doe",
    "relationType": "collaborates_with"
  }
]
```

#### Behavior Notes
- **No Validation**: Does not verify that referenced entities exist
- **Duplicates**: Allows duplicate relations (same from/to/type)
- **Directional**: Relations have direction (from → to)
- **Persistence**: Automatically saved to disk

---

### `add_observations`

Adds new observations to existing entities without replacing existing ones.

#### Input Schema
```json
{
  "type": "object",
  "properties": {
    "observations": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "entityName": {
            "type": "string", 
            "description": "Name of entity to update"
          },
          "contents": {
            "type": "array",
            "items": {"type": "string"},
            "description": "New observations to add"
          }
        },
        "required": ["entityName", "contents"]
      }
    }
  },
  "required": ["observations"]
}
```

#### Example Request
```json
{
  "observations": [
    {
      "entityName": "alice-smith",
      "contents": [
        "Recently promoted to Principal Data Scientist",
        "Leading the NLP research team",
        "Speaks at international AI conferences"
      ]
    }
  ]
}
```

#### Response
Returns the input observations array:
```json
[
  {
    "entityName": "alice-smith",
    "contents": [
      "Recently promoted to Principal Data Scientist",
      "Leading the NLP research team", 
      "Speaks at international AI conferences"
    ]
  }
]
```

#### Behavior Notes
- **Appends Only**: Adds to existing observations without removal
- **Missing Entities**: Silently ignores non-existent entities
- **Duplicates**: Does not check for duplicate observations
- **Order**: New observations are appended to the end

---

### `delete_entities`

Removes entities from the knowledge graph and automatically cleans up related relationships.

#### Input Schema
```json
{
  "type": "object",
  "properties": {
    "entityNames": {
      "type": "array",
      "items": {"type": "string"},
      "description": "Array of entity names to delete"
    }
  },
  "required": ["entityNames"]
}
```

#### Example Request
```json
{
  "entityNames": ["alice-smith", "obsolete-project"]
}
```

#### Response
Returns array of actually deleted entities:
```json
[
  {
    "name": "alice-smith",
    "entityType": "person", 
    "observations": [
      "Senior data scientist",
      "PhD in Machine Learning from Stanford"
    ]
  }
]
```

#### Behavior Notes
- **Cascade Delete**: Automatically removes all relations involving deleted entities
- **Non-existent**: Silently ignores entities that don't exist
- **Return Value**: Only returns entities that were actually deleted
- **Irreversible**: Deletion cannot be undone

---

### `delete_observations`

Removes specific observations from entities while preserving the entities themselves.

#### Input Schema
```json
{
  "type": "object",
  "properties": {
    "deletions": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "entityName": {
            "type": "string",
            "description": "Name of entity to modify"
          },
          "observations": {
            "type": "array", 
            "items": {"type": "string"},
            "description": "Exact observation texts to remove"
          }
        },
        "required": ["entityName", "observations"]
      }
    }
  },
  "required": ["deletions"]
}
```

#### Example Request
```json
{
  "deletions": [
    {
      "entityName": "alice-smith",
      "observations": [
        "PhD in Machine Learning from Stanford",
        "Published 15+ research papers"
      ]
    }
  ]
}
```

#### Response
Returns the input deletions array:
```json
[
  {
    "entityName": "alice-smith",
    "observations": [
      "PhD in Machine Learning from Stanford",
      "Published 15+ research papers"  
    ]
  }
]
```

#### Behavior Notes
- **Exact Match**: Observations must match exactly (case-sensitive)
- **Missing Entities**: Silently ignores non-existent entities
- **Missing Observations**: Silently ignores observations that don't exist
- **Preserves Entity**: Entity remains even if all observations are removed

---

### `delete_relations`

Removes specific relationships from the knowledge graph.

#### Input Schema
```json
{
  "type": "object",
  "properties": {
    "relations": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "from": {
            "type": "string",
            "description": "Source entity name"
          },
          "to": {
            "type": "string",
            "description": "Target entity name" 
          },
          "relationType": {
            "type": "string",
            "description": "Relationship type"
          }
        },
        "required": ["from", "to", "relationType"]
      }
    }
  },
  "required": ["relations"]
}
```

#### Example Request
```json
{
  "relations": [
    {
      "from": "alice-smith",
      "to": "ai-research-lab",
      "relationType": "works_for"
    }
  ]
}
```

#### Response
Returns array of actually deleted relations:
```json
[
  {
    "from": "alice-smith",
    "to": "ai-research-lab", 
    "relationType": "works_for"
  }
]
```

#### Behavior Notes
- **Exact Match**: All three fields (from, to, relationType) must match exactly
- **Missing Relations**: Silently ignores non-existent relations
- **Return Value**: Only returns relations that were actually deleted
- **Entity Preservation**: Referenced entities are not affected

---

### `read_graph`

Returns the complete knowledge graph with all entities and relations.

#### Input Schema
```json
{
  "type": "object",
  "properties": {}
}
```

#### Example Request
```json
{}
```

#### Response
Returns complete graph structure:
```json
{
  "entities": [
    {
      "name": "alice-smith",
      "entityType": "person",
      "observations": [
        "Senior data scientist",
        "Expert in NLP and computer vision"
      ]
    },
    {
      "name": "ai-research-lab", 
      "entityType": "organization",
      "observations": [
        "Leading AI research institution",
        "Founded in 2020"
      ]
    }
  ],
  "relations": [
    {
      "from": "alice-smith",
      "to": "ai-research-lab",
      "relationType": "works_for"
    }
  ]
}
```

#### Behavior Notes
- **Complete Export**: Returns all data in the knowledge graph
- **Performance**: Can be slow with large graphs (>10,000+ entities)
- **Consistency**: Provides atomic snapshot of current state
- **No Filtering**: Returns all entities and relations without filtering

---

### `search_nodes`

Performs full-text search across entity names, types, and observations.

#### Input Schema
```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "description": "Search term to match against entities"
    }
  },
  "required": ["query"]
}
```

#### Example Request
```json
{
  "query": "data scientist"
}
```

#### Response
Returns array of matching entities:
```json
[
  {
    "name": "alice-smith",
    "entityType": "person",
    "observations": [
      "Senior data scientist",
      "Expert in NLP and computer vision"
    ]
  }
]
```

#### Behavior Notes
- **Case Insensitive**: Search is not case-sensitive
- **Substring Match**: Matches partial strings within text
- **Multi-field**: Searches across name, entityType, and all observations
- **No Ranking**: Results are not ranked by relevance
- **Performance**: Linear search through all entities

#### Search Examples
```json
// Search by name
{"query": "alice"}

// Search by type  
{"query": "person"}

// Search by observation content
{"query": "machine learning"}

// Search with multiple words
{"query": "senior data"}
```

---

### `open_nodes`

Retrieves specific entities by their names.

#### Input Schema
```json
{
  "type": "object",
  "properties": {
    "names": {
      "type": "array",
      "items": {"type": "string"},
      "description": "Array of entity names to retrieve"
    }
  },
  "required": ["names"] 
}
```

#### Example Request
```json
{
  "names": ["alice-smith", "ai-research-lab", "non-existent-entity"]
}
```

#### Response
Returns array of found entities (missing entities are omitted):
```json
[
  {
    "name": "alice-smith",
    "entityType": "person", 
    "observations": [
      "Senior data scientist",
      "Expert in NLP and computer vision"
    ]
  },
  {
    "name": "ai-research-lab",
    "entityType": "organization",
    "observations": [
      "Leading AI research institution", 
      "Founded in 2020"
    ]
  }
]
```

#### Behavior Notes
- **Exact Match**: Entity names must match exactly
- **Missing Entities**: Non-existent entities are silently omitted
- **Performance**: Efficient O(1) lookup per entity
- **Order**: Results may not match input order

## 🔌 Protocol Details

### MCP Compliance

The server implements the Model Context Protocol v2025-06-18 with the following capabilities:

```json
{
  "capabilities": {
    "tools": {},
    "prompts": {},
    "resources": {}
  }
}
```

### Request Format

All tool calls follow standard MCP format:

```json
{
  "method": "tools/call",
  "params": {
    "name": "tool_name",
    "arguments": {
      // Tool-specific arguments
    }
  },
  "jsonrpc": "2.0",
  "id": "request_id"
}
```

### Response Format

Successful responses:
```json
{
  "jsonrpc": "2.0",
  "id": "request_id",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "JSON_RESPONSE_DATA"
      }
    ]
  }
}
```

Error responses:
```json
{
  "jsonrpc": "2.0", 
  "id": "request_id",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"error\": \"Error message\"}"
      }
    ],
    "isError": true
  }
}
```

### Persistence

All changes are automatically persisted to JSON file:
- **Default Location**: `~/.cursor/memory.json`
- **Custom Location**: Set `MEMORY_PATH` environment variable
- **Format**: Pretty-printed JSON with 2-space indentation
- **Atomic Writes**: Directory creation and file writing are atomic
- **Error Handling**: Persistence errors are logged but don't fail operations

## 📈 Performance Characteristics

### Time Complexity

| Operation | Time Complexity | Notes |
|-----------|----------------|-------|
| `create_entities` | O(n) | n = number of entities |
| `create_relations` | O(n) | n = number of relations |  
| `add_observations` | O(n) | n = number of observations |
| `delete_entities` | O(n + m) | n = entities, m = relations (cascade) |
| `delete_observations` | O(n × m) | n = entities, m = observations per entity |
| `delete_relations` | O(n × m) | n = relations to delete, m = existing relations |
| `read_graph` | O(n + m) | n = entities, m = relations |
| `search_nodes` | O(n × m) | n = entities, m = average observations |
| `open_nodes` | O(n) | n = requested entities |

### Memory Usage

- **Entity Storage**: ~200-500 bytes per entity (depends on observations)
- **Relation Storage**: ~100 bytes per relation
- **Search Index**: None (linear search)
- **Peak Memory**: 2× normal during persistence operations

### Scalability Limits

| Metric | Limit | Performance Impact |
|--------|-------|-------------------|
| Entities | 10,000 | Acceptable performance |
| Entities | 50,000 | Noticeable search slowdown |
| Entities | 100,000+ | Consider database backend |
| Relations | 100,000 | Minimal impact |
| File Size | 10MB | Acceptable |
| File Size | 100MB+ | Slow startup/persistence |

## 🚨 Error Handling

### Common Error Conditions

1. **JSON Parse Errors**: Malformed input data
2. **Missing Required Fields**: Schema validation failures  
3. **File System Errors**: Permission or disk space issues
4. **Memory Errors**: Out of memory with large datasets

### Error Response Format

All errors return JSON with error message:
```json
{
  "error": "Descriptive error message"
}
```

### Error Categories

- **Validation Errors**: Invalid input schema
- **System Errors**: File system or memory issues
- **Logic Errors**: Data inconsistencies  
- **Protocol Errors**: MCP compliance issues

For detailed troubleshooting, see [debugging.md](debugging.md).