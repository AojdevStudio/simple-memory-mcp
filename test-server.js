/**
 * Test-only export of SimpleMemoryServer class
 * This allows tests to instantiate the server without starting the MCP transport
 */

import fs from 'fs/promises';
import path from 'path';

const MEMORY_PATH = process.env.MEMORY_PATH ? path.join(process.env.MEMORY_PATH, 'memory.json') : path.join(process.env.HOME, '.cursor', 'memory.json');

export class SimpleMemoryServer {
  constructor() {
    this.entities = new Map();
    this.relations = [];
    // Don't load memory in test mode
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
    } catch (error) {
      // Silent fail for tests
    }
  }

  async saveMemory() {
    // No-op for tests
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

  // Levenshtein distance for fuzzy matching
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

  calculateRelevanceScore(entity, query, matchType = 'exact') {
    let score = 0;
    const matchedFields = [];
    const highlights = {};

    const queryLower = query.toLowerCase();
    const nameLower = entity.name.toLowerCase();
    const typeLower = entity.entityType.toLowerCase();

    if (nameLower === queryLower) {
      score = 100;
      matchedFields.push('name');
      highlights.name = [query];
    } else if (nameLower.includes(queryLower)) {
      const position = nameLower.indexOf(queryLower);
      const coverage = query.length / entity.name.length;
      score = Math.max(score, 60 + (30 * (1 - position / entity.name.length)) * coverage);
      matchedFields.push('name');
      highlights.name = [query];
    }

    if (typeLower === queryLower) {
      score = Math.max(score, 85);
      matchedFields.push('entityType');
      highlights.entityType = [query];
    } else if (typeLower.includes(queryLower)) {
      score = Math.max(score, 70);
      matchedFields.push('entityType');
      highlights.entityType = [query];
    }

    const matchedObservations = [];
    const maxObservations = Math.min(entity.observations.length, 100);
    let foundMatches = 0;

    for (let i = 0; i < maxObservations && foundMatches < 5; i++) {
      const obs = entity.observations[i];
      if (obs.toLowerCase().includes(queryLower)) {
        try {
          const termFrequency = (obs.toLowerCase().match(new RegExp(queryLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
          const obsScore = 20 + Math.min(30, termFrequency * 10);
          score = Math.max(score, obsScore);
          matchedObservations.push(i);
          foundMatches++;
        } catch (e) {
          score = Math.max(score, 20);
          matchedObservations.push(i);
          foundMatches++;
        }
      }
    }

    if (matchedObservations.length > 0) {
      matchedFields.push('observations');
      highlights.observations = matchedObservations;
    }

    if (matchType === 'fuzzy') {
      score = score * 0.8;
    }

    return { score, matchedFields, highlights, matchType };
  }

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
        scoringResult.score = scoringResult.score * maxSimilarity;
        scoringResult.fuzzyMatch = true;
        scoringResult.similarity = maxSimilarity;
        scoringResult.bestField = bestField;

        fuzzyMatches.push({
          ...entity,
          _searchMeta: scoringResult
        });
      }
    });

    return fuzzyMatches;
  }

  searchNodes(params) {
    const startTime = Date.now();

    const {
      query,
      fields = ['name', 'entityType', 'observations'],
      limit = 50,
      minScore = 0,
      fuzzy = true,
      fuzzyThreshold = 0.7
    } = typeof params === 'string' ? { query: params } : params;

    if (!query || query.trim() === '') {
      return {
        results: [],
        metadata: {
          totalMatches: 0,
          returnedCount: 0,
          executionTimeMs: Date.now() - startTime,
          query: query || '',
          fuzzyUsed: false,
          topScore: 0,
          averageScore: 0,
          error: 'Query cannot be empty'
        }
      };
    }

    const truncatedQuery = query.length > 1000 ? query.substring(0, 1000) : query;
    const queryLower = truncatedQuery.toLowerCase();

    const results = [];

    this.entities.forEach(entity => {
      const searchFields = this.getSearchableFields(entity, fields);
      const searchText = searchFields.join(' ').toLowerCase();

      if (searchText.includes(queryLower)) {
        const scoringResult = this.calculateRelevanceScore(entity, truncatedQuery, 'exact');

        if (scoringResult.score >= minScore) {
          results.push({
            ...entity,
            _searchMeta: scoringResult
          });
        }
      }
    });

    if (fuzzy && results.length < 5) {
      const fuzzyResults = this.performFuzzySearch(truncatedQuery, fields, fuzzyThreshold);
      fuzzyResults.forEach(fuzzyMatch => {
        if (!results.find(r => r.name === fuzzyMatch.name)) {
          if (fuzzyMatch._searchMeta.score >= minScore) {
            results.push(fuzzyMatch);
          }
        }
      });
    }

    results.sort((a, b) => {
      const scoreDiff = b._searchMeta.score - a._searchMeta.score;
      if (scoreDiff !== 0) return scoreDiff;
      return a.name.localeCompare(b.name);
    });

    const limitedResults = results.slice(0, limit);

    const executionTimeMs = Date.now() - startTime;
    const metadata = {
      totalMatches: results.length,
      returnedCount: limitedResults.length,
      executionTimeMs,
      query: truncatedQuery,
      fuzzyUsed: fuzzy && results.some(r => r._searchMeta.matchType === 'fuzzy'),
      topScore: limitedResults.length > 0 ? limitedResults[0]._searchMeta.score : 0,
      averageScore: limitedResults.length > 0
        ? limitedResults.reduce((sum, r) => sum + r._searchMeta.score, 0) / limitedResults.length
        : 0
    };

    if (typeof params === 'string') {
      return limitedResults;
    }

    return { results: limitedResults, metadata };
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
}
