import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AGENT_REGISTRY, isAgentPermittedForTaskType, type AgentId } from '../src/agent-registry';

const ALL_AGENT_IDS: AgentId[] = [
  'emma',
  'estimate-agent',
  'scheduling-agent',
  'operations-agent',
  'review-agent',
  'seo-agent',
  'media-agent',
  'followup-agent',
];

test('every registered agent has at least one permitted task type', () => {
  for (const agentId of ALL_AGENT_IDS) {
    assert.ok(
      AGENT_REGISTRY[agentId].permittedTaskTypes.length > 0,
      `${agentId} must have at least one permitted task type`,
    );
  }
});

test('every registry entry key matches its own agentId field', () => {
  for (const agentId of ALL_AGENT_IDS) {
    assert.equal(AGENT_REGISTRY[agentId].agentId, agentId);
  }
});

test('isAgentPermittedForTaskType allows a task type the agent is registered for', () => {
  assert.equal(isAgentPermittedForTaskType('emma', 'customer-response'), true);
  assert.equal(isAgentPermittedForTaskType('media-agent', 'photo-review'), true);
});

test('isAgentPermittedForTaskType rejects a task type the agent is not registered for', () => {
  assert.equal(isAgentPermittedForTaskType('emma', 'seo-research'), false);
  assert.equal(isAgentPermittedForTaskType('media-agent', 'customer-response'), false);
});
