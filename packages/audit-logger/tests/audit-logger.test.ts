import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ConsoleAuditLogger } from '../src/console-audit-logger';
import { redactSecrets } from '../src/redact';

test('redactSecrets removes secret-shaped keys at any depth', () => {
  const redacted = redactSecrets({
    apiKey: 'sk-real-value',
    nested: { token: 'abc', safe: 'value' },
  });
  assert.equal(redacted.apiKey, '[redacted]');
  assert.equal(redacted.nested.token, '[redacted]');
  assert.equal(redacted.nested.safe, 'value');
});

test('record() stores and query() filters by taskId and outcome', () => {
  const logger = new ConsoleAuditLogger();
  logger.record({
    actor: { kind: 'system' },
    action: 'route-task',
    taskId: 'task-1',
    taskType: 'coding',
    outcome: 'success',
    metadata: {},
  });
  logger.record({
    actor: { kind: 'system' },
    action: 'route-task',
    taskId: 'task-2',
    taskType: 'debugging',
    outcome: 'error',
    metadata: {},
  });

  assert.equal(logger.query({ taskId: 'task-1' }).length, 1);
  assert.equal(logger.query({ outcome: 'error' }).length, 1);
  assert.equal(logger.query().length, 2);
});

test('record() never leaks a secret-shaped field, even if passed one', () => {
  const logger = new ConsoleAuditLogger();
  const event = logger.record({
    actor: { kind: 'provider', providerId: 'anthropic' },
    action: 'invoke',
    taskId: 'task-3',
    taskType: 'high-impact-review',
    outcome: 'success',
    metadata: { anthropicApiKey: 'sk-should-not-appear' },
  });

  assert.equal(event.metadata.anthropicApiKey, '[redacted]');
});
