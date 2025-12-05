#!/usr/bin/env node

/**
 * Enhanced Search Test Suite
 * Tests relevance scoring, fuzzy matching, and performance
 */

import { SimpleMemoryServer } from '../test-server.js';

// Test dataset
const testEntities = [
  { name: "JavaScript", entityType: "programming_language", observations: ["High-level", "Dynamic typing", "Popular for web development"] },
  { name: "TypeScript", entityType: "programming_language", observations: ["Superset of JavaScript", "Static typing", "Developed by Microsoft"] },
  { name: "Python", entityType: "programming_language", observations: ["Interpreted", "Dynamic typing", "Great for data science"] },
  { name: "React", entityType: "framework", observations: ["JavaScript library", "Component-based", "Developed by Meta"] },
  { name: "Node.js", entityType: "runtime", observations: ["JavaScript runtime", "Event-driven", "Non-blocking I/O"] }
];

// Test utilities
function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertArrayLength(arr, length, message) {
  assert(arr.length === length, `${message} (expected ${length}, got ${arr.length})`);
}

function assertScoreRange(score, min, max, message) {
  assert(score >= min && score <= max, `${message} (score ${score} not in range ${min}-${max})`);
}

// Test runner
class TestRunner {
  constructor() {
    this.tests = [];
    this.passed = 0;
    this.failed = 0;
  }

  test(name, fn) {
    this.tests.push({ name, fn });
  }

  async run() {
    console.log('🧪 Enhanced Search Test Suite\n');
    console.log('━'.repeat(60));

    for (const { name, fn } of this.tests) {
      try {
        await fn();
        this.passed++;
        console.log(`✅ ${name}`);
      } catch (error) {
        this.failed++;
        console.log(`❌ ${name}`);
        console.log(`   Error: ${error.message}`);
      }
    }

    console.log('━'.repeat(60));
    console.log(`\n📊 Results: ${this.passed} passed, ${this.failed} failed`);

    if (this.failed > 0) {
      process.exit(1);
    }
  }
}

// Create test instance
const runner = new TestRunner();

// Test Case 1: Exact Name Match
runner.test('Exact name match returns score 100', () => {
  const server = new SimpleMemoryServer();
  testEntities.forEach(entity => server.entities.set(entity.name, entity));

  const result = server.searchNodes({ query: "JavaScript" });

  assert(result.results.length > 0, 'Should return results');
  const jsResult = result.results.find(r => r.name === "JavaScript");
  assert(jsResult !== undefined, 'Should find JavaScript entity');
  assertScoreRange(jsResult._searchMeta.score, 95, 100, 'Exact match should score 95-100');
  assert(result.metadata.topScore >= 95, 'Top score should be >= 95');
});

// Test Case 2: Partial Name Match
runner.test('Partial name match returns correct scores', () => {
  const server = new SimpleMemoryServer();
  testEntities.forEach(entity => server.entities.set(entity.name, entity));

  const result = server.searchNodes({ query: "Script" });

  assert(result.results.length >= 2, 'Should find JavaScript and TypeScript');

  // Both JavaScript and TypeScript should be in results
  const hasJS = result.results.some(r => r.name === "JavaScript");
  const hasTS = result.results.some(r => r.name === "TypeScript");
  assert(hasJS && hasTS, 'Should find both JavaScript and TypeScript');

  // Results should be sorted by score
  for (let i = 1; i < result.results.length; i++) {
    assert(
      result.results[i-1]._searchMeta.score >= result.results[i]._searchMeta.score,
      'Results should be sorted by score descending'
    );
  }
});

// Test Case 3: Entity Type Search
runner.test('Entity type search filters correctly', () => {
  const server = new SimpleMemoryServer();
  testEntities.forEach(entity => server.entities.set(entity.name, entity));

  const result = server.searchNodes({
    query: "programming_language",
    fields: ["entityType"]
  });

  assert(result.results.length === 3, 'Should find exactly 3 programming languages');

  const languages = result.results.map(r => r.name);
  assert(languages.includes("JavaScript"), 'Should include JavaScript');
  assert(languages.includes("TypeScript"), 'Should include TypeScript');
  assert(languages.includes("Python"), 'Should include Python');
  assert(!languages.includes("React"), 'Should not include React');
  assert(!languages.includes("Node.js"), 'Should not include Node.js');
});

// Test Case 4: Fuzzy Matching
runner.test('Fuzzy matching catches typos', () => {
  const server = new SimpleMemoryServer();
  testEntities.forEach(entity => server.entities.set(entity.name, entity));

  const result = server.searchNodes({
    query: "Javasript", // typo: missing 'c'
    fuzzy: true
  });

  assert(result.results.length > 0, 'Should find results despite typo');

  const jsResult = result.results.find(r => r.name === "JavaScript");
  assert(jsResult !== undefined, 'Should find JavaScript with fuzzy matching');
  assert(result.metadata.fuzzyUsed, 'Metadata should indicate fuzzy was used');
});

// Test Case 5: Result Limiting
runner.test('Result limiting works correctly', () => {
  const server = new SimpleMemoryServer();
  // Add more entities for this test
  for (let i = 0; i < 20; i++) {
    server.entities.set(`TestEntity${i}`, {
      name: `TestEntity${i}`,
      entityType: "test_type",
      observations: ["test observation"]
    });
  }

  const result = server.searchNodes({
    query: "test",
    limit: 5
  });

  assertArrayLength(result.results, 5, 'Should return exactly 5 results');
  assert(result.metadata.totalMatches >= 5, 'Total matches should be >= returned count');
  assert(result.metadata.returnedCount === 5, 'Metadata should reflect returned count');
});

// Test Case 6: Minimum Score Filter
runner.test('Minimum score filter excludes low-relevance matches', () => {
  const server = new SimpleMemoryServer();
  testEntities.forEach(entity => server.entities.set(entity.name, entity));

  const resultLowMin = server.searchNodes({
    query: "web",
    minScore: 0
  });

  const resultHighMin = server.searchNodes({
    query: "web",
    minScore: 50
  });

  assert(
    resultHighMin.results.length <= resultLowMin.results.length,
    'Higher minScore should return fewer or equal results'
  );

  // All results should have score >= minScore
  resultHighMin.results.forEach(r => {
    assert(
      r._searchMeta.score >= 50,
      `All results should have score >= 50, got ${r._searchMeta.score}`
    );
  });
});

// Test Case 7: Empty Query Handling
runner.test('Empty query returns error', () => {
  const server = new SimpleMemoryServer();
  testEntities.forEach(entity => server.entities.set(entity.name, entity));

  const result = server.searchNodes({ query: "" });

  assertArrayLength(result.results, 0, 'Empty query should return no results');
  assert(result.metadata.error !== undefined, 'Should return error in metadata');
  assert(result.metadata.error.includes('empty'), 'Error should mention empty query');
});

// Test Case 8: Special Characters
runner.test('Special characters in query are handled safely', () => {
  const server = new SimpleMemoryServer();
  server.entities.set("C++", {
    name: "C++",
    entityType: "programming_language",
    observations: ["System programming", "OOP support"]
  });

  const result = server.searchNodes({ query: "C++" });

  assert(result.results.length > 0, 'Should find C++ entity');
  assert(result.results[0].name === "C++", 'Should match C++ exactly');
});

// Test Case 9: Observation Matching
runner.test('Observation content is searchable', () => {
  const server = new SimpleMemoryServer();
  testEntities.forEach(entity => server.entities.set(entity.name, entity));

  const result = server.searchNodes({ query: "data science" });

  assert(result.results.length > 0, 'Should find results in observations');

  const pythonResult = result.results.find(r => r.name === "Python");
  assert(pythonResult !== undefined, 'Should find Python via observation');
  assert(
    pythonResult._searchMeta.matchedFields.includes('observations'),
    'Should indicate observations matched'
  );
});

// Test Case 10: Backward Compatibility
runner.test('Backward compatibility with string query', () => {
  const server = new SimpleMemoryServer();
  testEntities.forEach(entity => server.entities.set(entity.name, entity));

  const result = server.searchNodes("JavaScript");

  // When called with string, should return array (not object with results/metadata)
  assert(Array.isArray(result), 'Should return array for backward compatibility');
  assert(result.length > 0, 'Should return results');
  assert(result[0]._searchMeta !== undefined, 'Should include search metadata');
});

// Test Case 11: Metadata Completeness
runner.test('Search metadata is complete and accurate', () => {
  const server = new SimpleMemoryServer();
  testEntities.forEach(entity => server.entities.set(entity.name, entity));

  const result = server.searchNodes({ query: "JavaScript" });

  assert(result.metadata !== undefined, 'Should include metadata');
  assert(typeof result.metadata.totalMatches === 'number', 'Should include totalMatches');
  assert(typeof result.metadata.returnedCount === 'number', 'Should include returnedCount');
  assert(typeof result.metadata.executionTimeMs === 'number', 'Should include executionTimeMs');
  assert(typeof result.metadata.query === 'string', 'Should include query');
  assert(typeof result.metadata.fuzzyUsed === 'boolean', 'Should include fuzzyUsed');
  assert(typeof result.metadata.topScore === 'number', 'Should include topScore');
  assert(typeof result.metadata.averageScore === 'number', 'Should include averageScore');
});

// Test Case 12: Performance Benchmarks
runner.test('Search performance meets targets', () => {
  const server = new SimpleMemoryServer();

  // Generate 1000 test entities
  for (let i = 0; i < 1000; i++) {
    server.entities.set(`Entity${i}`, {
      name: `Entity${i}`,
      entityType: i % 10 === 0 ? 'special_type' : 'regular_type',
      observations: [
        `Observation 1 for entity ${i}`,
        `Observation 2 for entity ${i}`,
        `Some searchable content ${i}`
      ]
    });
  }

  const result = server.searchNodes({ query: "special" });

  assert(result.metadata.executionTimeMs < 100,
    `Search should complete in <100ms for 1000 entities (took ${result.metadata.executionTimeMs}ms)`
  );
});

// Test Case 13: Fuzzy Threshold
runner.test('Fuzzy threshold controls match sensitivity', () => {
  const server = new SimpleMemoryServer();
  server.entities.set("Testing", {
    name: "Testing",
    entityType: "test",
    observations: []
  });

  const resultLowThreshold = server.searchNodes({
    query: "Testng", // 1 char difference
    fuzzy: true,
    fuzzyThreshold: 0.5
  });

  const resultHighThreshold = server.searchNodes({
    query: "Testng",
    fuzzy: true,
    fuzzyThreshold: 0.95
  });

  assert(
    resultLowThreshold.results.length >= resultHighThreshold.results.length,
    'Lower threshold should find more fuzzy matches'
  );
});

// Test Case 14: Field Filtering
runner.test('Field filtering restricts search scope', () => {
  const server = new SimpleMemoryServer();
  server.entities.set("TestEntity", {
    name: "TestEntity",
    entityType: "special_type",
    observations: ["contains searchterm"]
  });

  const nameOnlyResult = server.searchNodes({
    query: "special",
    fields: ["name"]
  });

  const typeOnlyResult = server.searchNodes({
    query: "special",
    fields: ["entityType"]
  });

  assertArrayLength(nameOnlyResult.results, 0, 'Should not find in name');
  assertArrayLength(typeOnlyResult.results, 1, 'Should find in entityType');
});

// Run all tests
runner.run().catch(console.error);
