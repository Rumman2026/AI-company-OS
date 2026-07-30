import { test } from 'node:test';
import assert from 'node:assert/strict';
import { providerRegistry, listEnabledAdapters } from '../src/registry';
import { APPROVED_PROVIDER_IDS } from '@ai-company-os/agent-sdk';

test('registry contains exactly the seven approved providers, no more, no fewer', () => {
  const registryIds = Object.keys(providerRegistry).sort();
  const approvedIds = [...APPROVED_PROVIDER_IDS].sort();
  assert.deepEqual(registryIds, approvedIds);
});

test('registry never contains grok, xai, or sakana', () => {
  const ids = Object.keys(providerRegistry);
  for (const bannedId of ['grok', 'xai', 'sakana']) {
    assert.ok(!ids.includes(bannedId));
  }
});

test('every adapter invoke() returns a not-implemented error, never a fabricated success', async () => {
  for (const adapter of Object.values(providerRegistry)) {
    const response = await adapter.invoke({
      taskId: 'test-task',
      taskType: adapter.descriptor.permittedTaskTypes[0],
      provider: adapter.descriptor.providerId,
      model: adapter.descriptor.modelAllowlist[0],
      context: {
        taskId: 'test-task',
        taskType: adapter.descriptor.permittedTaskTypes[0],
        summary: 'test',
        facts: {},
        relevantRecordIds: [],
        maxTokensHint: 100,
      },
      maxInputTokens: 100,
      maxOutputTokens: 100,
      requestedAtIso: new Date().toISOString(),
    });

    assert.equal(response.status, 'error');
    assert.equal(response.error?.classification, 'not-implemented');
  }
});

test('listEnabledAdapters excludes kill-switched or disabled providers', () => {
  const enabled = listEnabledAdapters();
  assert.equal(enabled.length, Object.keys(providerRegistry).length);
  for (const adapter of enabled) {
    assert.equal(adapter.descriptor.killSwitchEnabled, false);
  }
});

test('perplexity has no substitution partner (only approved web-research provider)', () => {
  assert.deepEqual(providerRegistry.perplexity.descriptor.substitutionRules.canBeSubstitutedBy, []);
});
