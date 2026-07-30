import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { CompactContextPackage } from '@ai-company-os/agent-sdk';
import { providerRegistry, createPlaceholderAdapter } from '@ai-company-os/provider-adapters';
import { InMemoryCostController } from '@ai-company-os/cost-controller';
import { ConsoleAuditLogger } from '@ai-company-os/audit-logger';
import type { PolicyContext } from '@ai-company-os/policy-engine';
import { TaskRouter } from '../src/task-router';

const neutralPolicyContext: PolicyContext = {
  confidence: 0.95,
  businessFactsConflict: false,
  involvesPricingScopeWarrantyOrContract: false,
  customerSentiment: 'neutral',
  isHighValueLead: false,
  providersDisagree: false,
  affectsSecurityAuthInfraOrProduction: false,
  requestsProductionDeploymentOrDataChange: false,
  policyEngineFlagged: false,
  ownerApprovalRequired: false,
};

function context(taskId: string): CompactContextPackage {
  return {
    taskId,
    taskType: 'crm-summary',
    summary: 'test',
    facts: {},
    relevantRecordIds: [],
    maxTokensHint: 100,
  };
}

function buildRouter() {
  return new TaskRouter({
    adapters: providerRegistry,
    costController: new InMemoryCostController(),
    auditLogger: new ConsoleAuditLogger(),
  });
}

test('deterministic resolution short-circuits without calling any provider', async () => {
  const router = buildRouter();
  const result = await router.routeTask({
    taskId: 't1',
    taskType: 'crm-summary',
    context: context('t1'),
    policyContext: neutralPolicyContext,
    model: 'glm-4.6',
    maxInputTokens: 100,
    maxOutputTokens: 100,
    businessId: 'greencal-pressure-washing',
    agentId: 'test-agent',
    tryDeterministicResolution: () => ({ structuredResult: { resolved: true } }),
  });

  assert.equal(result.decision.usedDeterministicResolution, true);
  assert.equal(result.response, null);
  assert.deepEqual(result.deterministic, { structuredResult: { resolved: true } });
});

test('routes crm-summary to zai-glm with no escalation when nothing triggers it', async () => {
  const router = buildRouter();
  const result = await router.routeTask({
    taskId: 't2',
    taskType: 'crm-summary',
    context: context('t2'),
    policyContext: neutralPolicyContext,
    model: 'glm-4.6',
    maxInputTokens: 100,
    maxOutputTokens: 100,
    businessId: 'greencal-pressure-washing',
    agentId: 'test-agent',
  });

  assert.equal(result.decision.selectedProvider, 'zai-glm');
  assert.equal(result.decision.escalated, false);
});

test('escalates to anthropic when the customer is upset, regardless of task type default', async () => {
  const router = buildRouter();
  const result = await router.routeTask({
    taskId: 't3',
    taskType: 'customer-response',
    context: context('t3'),
    policyContext: { ...neutralPolicyContext, customerSentiment: 'upset' },
    model: 'gpt-5',
    maxInputTokens: 100,
    maxOutputTokens: 100,
    businessId: 'greencal-pressure-washing',
    agentId: 'test-agent',
  });

  assert.equal(result.decision.selectedProvider, 'anthropic');
  assert.equal(result.decision.escalated, true);
  assert.deepEqual(result.decision.escalationReasons, ['customer-upset']);
});

test('high-impact-review always routes directly to anthropic even with a neutral policy context', async () => {
  const router = buildRouter();
  const result = await router.routeTask({
    taskId: 't4',
    taskType: 'high-impact-review',
    context: context('t4'),
    policyContext: neutralPolicyContext,
    model: 'claude-sonnet-5',
    maxInputTokens: 100,
    maxOutputTokens: 100,
    businessId: 'greencal-pressure-washing',
    agentId: 'test-agent',
  });

  assert.equal(result.decision.selectedProvider, 'anthropic');
});

test('a kill-switched primary provider falls back to exactly one substitute, not a full chain', async () => {
  // Build via the real factory so invoke()'s closure actually observes
  // the kill switch — spreading the descriptor alone would leave the
  // original adapter's invoke() bound to the un-killed descriptor.
  const killedRegistry = {
    ...providerRegistry,
    'zai-glm': createPlaceholderAdapter({
      ...providerRegistry['zai-glm'].descriptor,
      killSwitchEnabled: true,
    }),
  };
  const router = new TaskRouter({
    adapters: killedRegistry,
    costController: new InMemoryCostController(),
    auditLogger: new ConsoleAuditLogger(),
  });

  const result = await router.routeTask({
    taskId: 't5',
    taskType: 'crm-summary',
    context: context('t5'),
    policyContext: neutralPolicyContext,
    model: 'glm-4.6',
    maxInputTokens: 100,
    maxOutputTokens: 100,
    businessId: 'greencal-pressure-washing',
    agentId: 'test-agent',
  });

  assert.equal(result.decision.selectedProvider, 'deepseek');
});
