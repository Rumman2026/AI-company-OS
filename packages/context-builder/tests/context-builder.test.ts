import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildContextPackage, estimateContextTokens } from '../src/context-builder';

test('buildContextPackage trims facts to the configured limit', () => {
  const facts: Record<string, string> = {};
  for (let i = 0; i < 30; i += 1) {
    facts[`fact_${i}`] = `value_${i}`;
  }

  const context = buildContextPackage({
    taskId: 'task-1',
    taskType: 'lead-qualification',
    summary: 'A short summary.',
    facts,
    relevantRecordIds: ['a', 'b', 'a'],
    maxFacts: 5,
  });

  assert.equal(Object.keys(context.facts).length, 5);
  assert.deepEqual(context.relevantRecordIds, ['a', 'b']);
});

test('buildContextPackage truncates an overlong summary', () => {
  const context = buildContextPackage({
    taskId: 'task-2',
    taskType: 'crm-summary',
    summary: 'x'.repeat(2000),
    facts: {},
    relevantRecordIds: [],
    maxSummaryChars: 100,
  });

  assert.equal(context.summary.length, 101);
});

test('estimateContextTokens is deterministic and positive for non-empty context', () => {
  const context = buildContextPackage({
    taskId: 'task-3',
    taskType: 'seo-research',
    summary: 'Some content about local SEO topics.',
    facts: { city: 'San Diego' },
    relevantRecordIds: ['rec-1'],
  });

  const tokens = estimateContextTokens(context);
  assert.ok(tokens > 0);
  assert.equal(tokens, estimateContextTokens(context));
});
