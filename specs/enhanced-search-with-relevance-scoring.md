# Enhanced Search with Relevance Scoring - Implementation Plan

## Problem Statement

The current `search_nodes` tool in the Simple Memory MCP Server has critical usability issues:

1. **Search returns no results** - Users report search "never finds anything"
2. **Context inefficiency** - Clients are forced to call `read_graph` to retrieve the entire knowledge base, consuming excessive tokens
3. **No result ranking** - When results are returned, there's no indication of match quality
4. **No search transparency** - Users don't know why searches fail or which fields matched
5. **Token waste** - For a graph with 100+ entities, `read_graph` can consume 10-50KB when users only need 2-3 specific entities

### User Impact

For a knowledge graph with 500 entities averaging 200 tokens each:
- **Current approach**: `read_graph` = ~100,000 tokens
- **Target approach**: `search_nodes` with limit = ~400-600 tokens
- **Potential savings**: 99% reduction in token usage for focused queries

## Objectives

### Primary Goals
1. Make search actually find relevant entities
2. Reduce token consumption by 80-95% for focused queries
3. Add relevance scoring to rank results by match quality
4. Provide search transparency through metadata

### Secondary Goals
1. Add fuzzy matching for typo tolerance
2. Enable field-specific searching (name, type, observations)
3. Support result pagination/limiting
4. Maintain backward compatibility with existing clients

### Non-Goals (Keeping It Simple)
- External search engines (Elasticsearch, Algolia)
- Full-text indexing with complex data structures
- Real-time streaming search results
- Multi-language stemming and lemmatization

## Technical Approach

### Architecture Decisions

**Decision 1: Enhance Existing Method vs. New Tool**
- **Choice**: Enhance existing `searchNodes` method
- **Rationale**: Maintains API consistency, backward compatible, simpler for clients
- **Implementation**: Make new parameters optional

**Decision 2: In-Memory vs. External Search Engine**
- **Choice**: In-memory search with simple algorithms
- **Rationale**:
  - Scale target is 10-20 users with 100-1000 entities
  - In-memory search can handle this in <100ms
  - No operational complexity of external dependencies
  - Keeps deployment simple

**Decision 3: Fuzzy Matching Implementation**
- **Choice**: Simple string similarity without external libraries
- **Rationale**:
  - Avoid adding dependencies
  - Simple algorithms (Levenshtein, substring matching) sufficient for this scale
  - Can implement in ~50 lines of code

### Data Model Changes

**Input Schema Enhancement**
```javascript
{
  query: string,                    // required: search query
  fields?: string[],                // optional: ['name', 'entityType', 'observations']
  limit?: number,                   // optional: max results (default 50)
  minScore?: number,                // optional: minimum relevance score 0-100 (default 0)
  fuzzy?: boolean,                  // optional: enable fuzzy matching (default true)
  fuzzyThreshold?: number          // optional: similarity threshold 0-1 (default 0.7)
}
```

**Output Schema Enhancement**
```javascript
{
  results: Array<{
    ...entity,                      // existing entity fields
    _searchMeta: {
      score: number,                // relevance score 0-100
      matchedFields: string[],      // which fields matched
      matchType: 'exact' | 'fuzzy', // how it matched
      highlights: {                 // where matches occurred
        name?: string[],
        entityType?: string[],
        observations?: number[]     // indices of matched observations
      }
    }
  }>,
  metadata: {
    totalMatches: number,           // total results found
    returnedCount: number,          // number returned (after limit)
    executionTimeMs: number,        // search duration
    query: string,                  // original query
    fuzzyUsed: boolean,             // whether fuzzy matching was applied
    topScore: number,               // highest score in results
    averageScore: number           // average score of returned results
  }
}
```

### Scoring Algorithm

**Relevance Score Calculation (0-100 scale)**

1. **Exact Name Match**: 100 points
   ```javascript
   if (entity.name.toLowerCase() === query.toLowerCase()) {
     score = 100;
   }
   ```

2. **Name Contains Query**: 60-90 points
   ```javascript
   if (entity.name.toLowerCase().includes(query.toLowerCase())) {
     // Score based on match position and query coverage
     const position = entity.name.toLowerCase().indexOf(query.toLowerCase());
     const coverage = query.length / entity.name.length;
     score = 60 + (30 * (1 - position / entity.name.length)) * coverage;
   }
   ```

3. **Entity Type Match**: 70-85 points
   ```javascript
   if (entity.entityType.toLowerCase() === query.toLowerCase()) {
     score = 85;
   } else if (entity.entityType.toLowerCase().includes(query.toLowerCase())) {
     score = 70;
   }
   ```

4. **Observation Match**: 20-50 points per observation
   ```javascript
   entity.observations.forEach(obs => {
     if (obs.toLowerCase().includes(query.toLowerCase())) {
       // Score based on term frequency and observation position
       const termFrequency = countOccurrences(obs, query);
       const observationImportance = 1.0; // Could weight earlier observations higher
       const baseScore = 20;
       const bonusScore = Math.min(30, termFrequency * 10);
       score = Math.max(score, baseScore + bonusScore);
     }
   });
   ```

5. **Fuzzy Match Penalty**: Multiply score by similarity ratio
   ```javascript
   if (matchType === 'fuzzy') {
     score = score * similarityRatio; // 0.7-0.99
   }
   ```

### Fuzzy Matching Implementation

**Simple String Similarity (No External Dependencies)**

```javascript
// Levenshtein distance calculation
function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

// Similarity ratio (0-1 scale)
function similarityRatio(str1, str2) {
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  return 1 - (distance / maxLength);
}

// Apply fuzzy matching when exact search yields few results
function applyFuzzySearch(query, entities, threshold = 0.7) {
  const fuzzyMatches = [];

  entities.forEach(entity => {
    const nameRatio = similarityRatio(query, entity.name);
    const typeRatio = similarityRatio(query, entity.entityType);

    if (nameRatio >= threshold || typeRatio >= threshold) {
      fuzzyMatches.push({
        entity,
        similarity: Math.max(nameRatio, typeRatio),
        matchType: 'fuzzy'
      });
    }
  });

  return fuzzyMatches;
}
```

## Implementation Steps

### Phase 1: Core Search Enhancement (Day 1)

**Step 1.1: Create Scoring Infrastructure**
- Add scoring calculation function
- Implement match type detection (exact, partial, fuzzy)
- Create score sorting logic

```javascript
// Add to SimpleMemoryServer class
calculateRelevanceScore(entity, query, matchType = 'exact') {
  let score = 0;
  const matchedFields = [];
  const highlights = {};

  // Name matching logic
  if (entity.name.toLowerCase() === query.toLowerCase()) {
    score = 100;
    matchedFields.push('name');
    highlights.name = [query];
  } else if (entity.name.toLowerCase().includes(query.toLowerCase())) {
    const position = entity.name.toLowerCase().indexOf(query.toLowerCase());
    const coverage = query.length / entity.name.length;
    score = Math.max(score, 60 + (30 * (1 - position / entity.name.length)) * coverage);
    matchedFields.push('name');
    highlights.name = [query];
  }

  // Entity type matching logic
  if (entity.entityType.toLowerCase() === query.toLowerCase()) {
    score = Math.max(score, 85);
    matchedFields.push('entityType');
    highlights.entityType = [query];
  } else if (entity.entityType.toLowerCase().includes(query.toLowerCase())) {
    score = Math.max(score, 70);
    matchedFields.push('entityType');
    highlights.entityType = [query];
  }

  // Observation matching logic
  const matchedObservations = [];
  entity.observations.forEach((obs, index) => {
    if (obs.toLowerCase().includes(query.toLowerCase())) {
      const termFrequency = (obs.toLowerCase().match(new RegExp(query.toLowerCase(), 'g')) || []).length;
      const obsScore = 20 + Math.min(30, termFrequency * 10);
      score = Math.max(score, obsScore);
      matchedObservations.push(index);
    }
  });

  if (matchedObservations.length > 0) {
    matchedFields.push('observations');
    highlights.observations = matchedObservations;
  }

  // Apply fuzzy penalty if applicable
  if (matchType === 'fuzzy') {
    score = score * 0.8; // Fuzzy matches get 80% of exact match score
  }

  return { score, matchedFields, highlights, matchType };
}
```

**Step 1.2: Refactor searchNodes Method**
```javascript
searchNodes(params) {
  const startTime = Date.now();

  // Parse parameters with defaults
  const {
    query,
    fields = ['name', 'entityType', 'observations'],
    limit = 50,
    minScore = 0,
    fuzzy = true,
    fuzzyThreshold = 0.7
  } = typeof params === 'string' ? { query: params } : params;

  const results = [];

  // Exact search
  this.entities.forEach(entity => {
    const searchFields = this.getSearchableFields(entity, fields);
    const searchText = searchFields.join(' ').toLowerCase();

    if (searchText.includes(query.toLowerCase())) {
      const scoringResult = this.calculateRelevanceScore(entity, query, 'exact');

      if (scoringResult.score >= minScore) {
        results.push({
          ...entity,
          _searchMeta: scoringResult
        });
      }
    }
  });

  // Fuzzy search fallback (if enabled and few results)
  if (fuzzy && results.length < 5) {
    const fuzzyResults = this.performFuzzySearch(query, fields, fuzzyThreshold);
    fuzzyResults.forEach(fuzzyMatch => {
      // Avoid duplicates
      if (!results.find(r => r.name === fuzzyMatch.name)) {
        results.push(fuzzyMatch);
      }
    });
  }

  // Sort by score descending
  results.sort((a, b) => b._searchMeta.score - a._searchMeta.score);

  // Apply limit
  const limitedResults = results.slice(0, limit);

  // Calculate metadata
  const executionTimeMs = Date.now() - startTime;
  const metadata = {
    totalMatches: results.length,
    returnedCount: limitedResults.length,
    executionTimeMs,
    query,
    fuzzyUsed: fuzzy && results.some(r => r._searchMeta.matchType === 'fuzzy'),
    topScore: limitedResults.length > 0 ? limitedResults[0]._searchMeta.score : 0,
    averageScore: limitedResults.length > 0
      ? limitedResults.reduce((sum, r) => sum + r._searchMeta.score, 0) / limitedResults.length
      : 0
  };

  return { results: limitedResults, metadata };
}
```

### Phase 2: Field Filtering (Day 1)

**Step 2.1: Implement Field Selection**
```javascript
getSearchableFields(entity, fields) {
  const searchableFields = [];

  if (fields.includes('name')) {
    searchableFields.push(entity.name);
  }

  if (fields.includes('entityType')) {
    searchableFields.push(entity.entityType);
  }

  if (fields.includes('observations')) {
    searchableFields.push(...entity.observations);
  }

  return searchableFields;
}
```

### Phase 3: Fuzzy Matching (Day 2)

**Step 3.1: Implement String Similarity**
```javascript
// Add Levenshtein distance implementation
levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

similarityRatio(str1, str2) {
  const distance = this.levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLength = Math.max(str1.length, str2.length);
  return 1 - (distance / maxLength);
}
```

**Step 3.2: Implement Fuzzy Search**
```javascript
performFuzzySearch(query, fields, threshold) {
  const fuzzyMatches = [];

  this.entities.forEach(entity => {
    let maxSimilarity = 0;
    let bestField = '';

    if (fields.includes('name')) {
      const nameSim = this.similarityRatio(query, entity.name);
      if (nameSim > maxSimilarity) {
        maxSimilarity = nameSim;
        bestField = 'name';
      }
    }

    if (fields.includes('entityType')) {
      const typeSim = this.similarityRatio(query, entity.entityType);
      if (typeSim > maxSimilarity) {
        maxSimilarity = typeSim;
        bestField = 'entityType';
      }
    }

    if (maxSimilarity >= threshold) {
      const scoringResult = this.calculateRelevanceScore(entity, query, 'fuzzy');
      // Apply fuzzy penalty
      scoringResult.score = scoringResult.score * maxSimilarity;

      fuzzyMatches.push({
        ...entity,
        _searchMeta: {
          ...scoringResult,
          fuzzyMatch: true,
          similarity: maxSimilarity,
          bestField
        }
      });
    }
  });

  return fuzzyMatches;
}
```

### Phase 4: Update MCP Tool Schema (Day 2)

**Step 4.1: Update Tool Registration**
```javascript
// Update in server.setRequestHandler(ListToolsRequestSchema)
{
  name: "search_nodes",
  description: "Search for nodes in the knowledge graph with relevance scoring and fuzzy matching",
  inputSchema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The search query to match against entity data"
      },
      fields: {
        type: "array",
        items: {
          type: "string",
          enum: ["name", "entityType", "observations"]
        },
        description: "Which fields to search in (default: all fields)",
        default: ["name", "entityType", "observations"]
      },
      limit: {
        type: "number",
        description: "Maximum number of results to return (default: 50)",
        default: 50,
        minimum: 1,
        maximum: 200
      },
      minScore: {
        type: "number",
        description: "Minimum relevance score (0-100) to include in results (default: 0)",
        default: 0,
        minimum: 0,
        maximum: 100
      },
      fuzzy: {
        type: "boolean",
        description: "Enable fuzzy matching for typo tolerance (default: true)",
        default: true
      },
      fuzzyThreshold: {
        type: "number",
        description: "Similarity threshold for fuzzy matching (0-1, default: 0.7)",
        default: 0.7,
        minimum: 0,
        maximum: 1
      }
    },
    required: ["query"]
  }
}
```

**Step 4.2: Update Tool Handler**
```javascript
// Update in server.setRequestHandler(CallToolRequestSchema)
case "search_nodes":
  const searchResults = memoryServer.searchNodes(args);
  return {
    content: [{
      type: "text",
      text: JSON.stringify(searchResults, null, 2)
    }]
  };
```

### Phase 5: Testing & Validation (Day 3)

**Step 5.1: Create Test Dataset**
```javascript
// Test script: tests/search-test.js
const testEntities = [
  { name: "JavaScript", entityType: "programming_language", observations: ["High-level", "Dynamic typing", "Popular for web development"] },
  { name: "TypeScript", entityType: "programming_language", observations: ["Superset of JavaScript", "Static typing", "Developed by Microsoft"] },
  { name: "Python", entityType: "programming_language", observations: ["Interpreted", "Dynamic typing", "Great for data science"] },
  { name: "React", entityType: "framework", observations: ["JavaScript library", "Component-based", "Developed by Meta"] },
  { name: "Node.js", entityType: "runtime", observations: ["JavaScript runtime", "Event-driven", "Non-blocking I/O"] }
];
```

**Step 5.2: Test Cases**

**Test Case 1: Exact Name Match**
```javascript
Input: { query: "JavaScript" }
Expected:
  - JavaScript entity with score 100
  - Possibly React and Node.js with lower scores (observation matches)
```

**Test Case 2: Partial Name Match**
```javascript
Input: { query: "Script" }
Expected:
  - JavaScript and TypeScript with scores 60-90
  - Sorted by relevance
```

**Test Case 3: Entity Type Search**
```javascript
Input: { query: "programming_language", fields: ["entityType"] }
Expected:
  - JavaScript, TypeScript, Python with scores 70-85
  - React and Node.js excluded (different entity types)
```

**Test Case 4: Fuzzy Matching**
```javascript
Input: { query: "Javasript", fuzzy: true } // typo
Expected:
  - JavaScript entity found with fuzzy match
  - Score penalized for fuzzy match
  - metadata.fuzzyUsed = true
```

**Test Case 5: Result Limiting**
```javascript
Input: { query: "type", limit: 2 }
Expected:
  - Only top 2 results returned
  - metadata.totalMatches > metadata.returnedCount
```

**Test Case 6: Minimum Score Filter**
```javascript
Input: { query: "web", minScore: 50 }
Expected:
  - Only high-relevance matches returned
  - Weak observation matches filtered out
```

**Step 5.3: Performance Benchmarks**
```javascript
// Benchmark test with varying dataset sizes
function benchmarkSearch(entityCount) {
  const entities = generateTestEntities(entityCount);
  const queries = ["test", "program", "development"];

  const times = [];
  queries.forEach(query => {
    const start = Date.now();
    memoryServer.searchNodes({ query });
    const duration = Date.now() - start;
    times.push(duration);
  });

  const avgTime = times.reduce((a, b) => a + b) / times.length;
  console.log(`${entityCount} entities: ${avgTime}ms average`);

  // Assert performance targets
  if (entityCount <= 100) assert(avgTime < 10);
  if (entityCount <= 500) assert(avgTime < 50);
  if (entityCount <= 1000) assert(avgTime < 100);
}
```

## Edge Cases & Error Handling

### Input Validation

**Edge Case 1: Empty Query**
```javascript
Input: { query: "" }
Handling: Return empty results with metadata indicating invalid query
Response: { results: [], metadata: { error: "Query cannot be empty" } }
```

**Edge Case 2: Very Long Query (>1000 chars)**
```javascript
Input: { query: "a".repeat(1001) }
Handling: Truncate query to 1000 chars, log warning
Response: Normal search with truncated query, metadata notes truncation
```

**Edge Case 3: Special Characters**
```javascript
Input: { query: "C++ programming" }
Handling: Escape regex special characters, handle literally
Test: Ensure +, *, ?, [], () don't break search
```

**Edge Case 4: Unicode and Emoji**
```javascript
Input: { query: "🔥 hot topic" }
Handling: Support Unicode properly in similarity calculations
Test: Verify emoji and international characters work correctly
```

### Search Quality Edge Cases

**Edge Case 5: No Results Found**
```javascript
Input: { query: "nonexistent_entity_xyz" }
Response: {
  results: [],
  metadata: {
    totalMatches: 0,
    returnedCount: 0,
    query: "nonexistent_entity_xyz",
    fuzzyUsed: true,
    suggestion: "Try broader search terms or check spelling"
  }
}
```

**Edge Case 6: All Entities Match (Too Broad)**
```javascript
Input: { query: "e" } // Single letter matches everything
Handling: Return top N results by score
Response: Limit to 50 (default), metadata shows totalMatches > returnedCount
```

**Edge Case 7: Identical Scores**
```javascript
Scenario: Multiple entities have same relevance score
Handling: Secondary sort by entity name alphabetically
Test: Verify consistent ordering across multiple searches
```

### Performance Edge Cases

**Edge Case 8: Large Number of Observations**
```javascript
Scenario: Entity has 1000+ observations
Handling: Limit observation scanning to first 100 observations
Optimization: Stop scanning after finding 5 matches in observations
```

**Edge Case 9: Concurrent Searches**
```javascript
Scenario: Multiple clients search simultaneously
Handling: Read-only operation, no locking needed
Test: Verify thread-safety and performance under concurrent load
```

## Success Criteria

### Functional Requirements ✅

1. **Search Accuracy**
   - [ ] Exact name matches return score of 100
   - [ ] Partial matches return scores between 20-90
   - [ ] Results are sorted by relevance score
   - [ ] Fuzzy matching catches 1-2 character typos

2. **Context Efficiency**
   - [ ] Focused searches use <10KB tokens (vs 100KB+ for read_graph)
   - [ ] Result limiting prevents token overflow
   - [ ] Field filtering reduces unnecessary data transfer
   - [ ] Average query returns <10 entities instead of entire graph

3. **Search Transparency**
   - [ ] Metadata shows total matches vs returned count
   - [ ] Match locations are highlighted
   - [ ] Execution time is reported
   - [ ] Fuzzy usage is indicated

4. **Backward Compatibility**
   - [ ] Existing `searchNodes("query")` calls still work
   - [ ] Response format is backward compatible (results array)
   - [ ] No breaking changes to API contract

### Performance Requirements 📊

| Dataset Size | Target Latency | Actual | Status |
|--------------|----------------|--------|--------|
| 100 entities | <10ms | TBD | ⏳ |
| 500 entities | <50ms | TBD | ⏳ |
| 1000 entities | <100ms | TBD | ⏳ |

### Quality Metrics 🎯

1. **Search Success Rate**: >90% of searches return relevant results
2. **Token Efficiency**: 80-95% reduction vs read_graph for focused queries
3. **Fuzzy Match Rate**: 70-85% of typos caught within 2-character edit distance
4. **Performance Consistency**: 95% of searches complete within target latency

### User Experience Goals 🎨

1. **Discoverability**: Users understand search capabilities from tool description
2. **Feedback Quality**: Metadata provides actionable insights on search quality
3. **Predictability**: Consistent scoring and ranking across similar queries
4. **Flexibility**: Advanced users can fine-tune search with optional parameters

## Rollout Plan

### Phase 1: Development (Days 1-3)
- Implement core scoring and search enhancement
- Add fuzzy matching
- Update MCP tool schema
- Write comprehensive tests

### Phase 2: Testing (Day 4)
- Run test suite with various datasets
- Performance benchmarking
- Edge case validation
- Manual testing with real-world queries

### Phase 3: Documentation (Day 4)
- Update README with search examples
- Document scoring algorithm
- Add troubleshooting guide
- Create migration guide for existing users

### Phase 4: Deployment (Day 5)
- Deploy to test environment
- Gather user feedback
- Monitor performance metrics
- Iterate based on real usage

## Monitoring & Metrics

### Key Metrics to Track

1. **Search Usage**
   - Number of search_nodes calls vs read_graph calls
   - Average results returned per search
   - Common search queries

2. **Performance**
   - Average search latency
   - P95 and P99 latencies
   - Token consumption per search

3. **Quality**
   - Searches returning 0 results (failure rate)
   - Fuzzy match usage rate
   - Average relevance scores

4. **Context Efficiency**
   - Token savings vs read_graph baseline
   - Average payload size

### Success Dashboard

```
Search Performance Dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Search Success Rate:     94% ✅
Avg Latency:            23ms ✅
Token Efficiency:       -87% ✅
Fuzzy Match Rate:       76% ✅
P95 Latency:           45ms ✅
```

## Future Enhancements (Out of Scope)

1. **Advanced Queries**
   - Boolean operators (AND, OR, NOT)
   - Phrase matching ("exact phrase")
   - Wildcard support (java*)

2. **Relation Search**
   - Search across relations, not just entities
   - Graph traversal queries

3. **Search History**
   - Cache recent searches
   - Search suggestions based on history

4. **Multi-language Support**
   - Stemming and lemmatization
   - Language-specific similarity algorithms

5. **Search Analytics**
   - Track search patterns
   - Identify popular queries
   - Suggest related searches

## Conclusion

This implementation plan provides a pragmatic approach to fixing the search functionality in the Simple Memory MCP Server. By focusing on:

1. **Relevance scoring** - Users get the best matches first
2. **Fuzzy matching** - Typos don't break search
3. **Context efficiency** - 80-95% reduction in token usage
4. **Search transparency** - Users understand search quality
5. **Backward compatibility** - Existing clients continue to work

The solution stays true to the project's philosophy of simplicity while solving the core problem: making search actually work and dramatically reducing token consumption.

### Expected Impact

- **For Users**: Search becomes reliable and useful
- **For Token Costs**: 80-95% reduction for focused queries
- **For Scalability**: Handles 10-20 users with 1000+ entities efficiently
- **For Maintenance**: Simple, dependency-free implementation

### Implementation Effort

- **Development Time**: 3-4 days
- **Testing Time**: 1 day
- **Documentation**: 0.5 days
- **Total**: ~5 days for complete implementation

This represents a high-impact, low-complexity improvement that transforms the search experience from "doesn't work" to "works excellently" while maintaining the project's core simplicity.
