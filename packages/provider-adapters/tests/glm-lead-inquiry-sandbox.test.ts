import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GlmPilotSandboxHarness,
  fixedResponseMock,
  hangingMock,
  throwingMock,
} from '../src/glm-lead-inquiry/sandbox-harness';
import {
  GLM_PILOT_BUDGET_DEFAULTS,
  GLM_PILOT_BUDGET_SCOPE,
} from '../src/glm-lead-inquiry/pilot-budget';
import * as fixtures from '../src/glm-lead-inquiry/fixtures';

// Fast budget config for timeout/retry-exhaustion tests — the real
// defaults (15s timeout) would make this suite slow without changing
// what's being proven.
const FAST_BUDGET = { ...GLM_PILOT_BUDGET_DEFAULTS, requestTimeoutMs: 50, maxRetries: 1 };

test('residential roof-wash inquiry classifies correctly with no escalation', async () => {
  const harness = new GlmPilotSandboxHarness();
  const outcome = await harness.classify(
    fixtures.residentialRoofWashRequest,
    fixedResponseMock(fixtures.residentialRoofWashResponse),
  );
  assert.equal(outcome.status, 'success');
  assert.equal(outcome.result?.intentCategory, 'residential');
  assert.equal(outcome.result?.requiresEscalation, false);
  assert.equal(harness.getCallCount(), 1);
});

test('commercial gas-station inquiry classifies as commercial', async () => {
  const harness = new GlmPilotSandboxHarness();
  const outcome = await harness.classify(
    fixtures.commercialGasStationRequest,
    fixedResponseMock(fixtures.commercialGasStationResponse),
  );
  assert.equal(outcome.status, 'success');
  assert.equal(outcome.result?.intentCategory, 'commercial');
});

test('HOA sidewalk-cleaning inquiry classifies as hoa', async () => {
  const harness = new GlmPilotSandboxHarness();
  const outcome = await harness.classify(
    fixtures.hoaSidewalkRequest,
    fixedResponseMock(fixtures.hoaSidewalkResponse),
  );
  assert.equal(outcome.status, 'success');
  assert.equal(outcome.result?.intentCategory, 'hoa');
});

test('unclear/incomplete inquiry below confidence threshold escalates for low confidence', async () => {
  const harness = new GlmPilotSandboxHarness();
  const outcome = await harness.classify(
    fixtures.unclearInquiryRequest,
    fixedResponseMock(fixtures.unclearInquiryResponse),
  );
  assert.equal(outcome.status, 'low-confidence-escalated');
  assert.equal(outcome.result?.requiresEscalation, true);
  assert.ok(outcome.result?.escalationReasons.includes('low-confidence'));
});

test('spam inquiry classifies as spam with no escalation and no response template requiring action', async () => {
  const harness = new GlmPilotSandboxHarness();
  const outcome = await harness.classify(
    fixtures.spamInquiryRequest,
    fixedResponseMock(fixtures.spamInquiryResponse),
  );
  assert.equal(outcome.status, 'success');
  assert.equal(outcome.result?.intentCategory, 'spam');
  assert.equal(outcome.result?.recommendedTemplateId, 'template-spam-no-response');
});

test('angry customer inquiry flags customer-upset escalation, never auto-drafts a reply', async () => {
  const harness = new GlmPilotSandboxHarness();
  const outcome = await harness.classify(
    fixtures.angryCustomerRequest,
    fixedResponseMock(fixtures.angryCustomerResponse),
  );
  assert.equal(outcome.status, 'success');
  assert.equal(outcome.result?.requiresEscalation, true);
  assert.deepEqual(outcome.result?.escalationReasons, ['customer-upset']);
  assert.equal(outcome.result?.recommendedTemplateId, 'template-escalate-to-owner');
});

test('pricing request flags pricing-scope-warranty-or-contract escalation and never quotes a price itself', async () => {
  const harness = new GlmPilotSandboxHarness();
  const outcome = await harness.classify(
    fixtures.pricingRequestRequest,
    fixedResponseMock(fixtures.pricingRequestResponse),
  );
  assert.equal(outcome.status, 'success');
  assert.equal(outcome.result?.requiresEscalation, true);
  assert.deepEqual(outcome.result?.escalationReasons, ['pricing-scope-warranty-or-contract']);
  assert.doesNotMatch(outcome.result?.summary ?? '', /\$\d/);
});

test('no scenario ever exercises a provider other than zai-glm', async () => {
  const harness = new GlmPilotSandboxHarness();
  await harness.classify(
    fixtures.residentialRoofWashRequest,
    fixedResponseMock(fixtures.residentialRoofWashResponse),
  );
  await harness.classify(
    fixtures.pricingRequestRequest,
    fixedResponseMock(fixtures.pricingRequestResponse),
  );
  assert.deepEqual(harness.getDistinctProviderActors(), ['zai-glm']);
});

test('budget enforcement: an already-exhausted daily budget denies the call before invoking the model', async () => {
  const harness = new GlmPilotSandboxHarness({
    ...GLM_PILOT_BUDGET_DEFAULTS,
    dailySpendLimitUsd: 1,
  });
  // Simulate prior spend today that already exceeds the daily limit —
  // a $0 limit with $0 spent so far is still "within budget" under the
  // cost-controller's <= semantics, so denial must be proven with real
  // recorded spend, not just a zeroed-out limit.
  harness.costController.recordSpend(
    GLM_PILOT_BUDGET_SCOPE.scope,
    GLM_PILOT_BUDGET_SCOPE.scopeId,
    'zai-glm',
    5,
  );

  const outcome = await harness.classify(
    fixtures.residentialRoofWashRequest,
    fixedResponseMock(fixtures.residentialRoofWashResponse),
  );
  assert.equal(outcome.status, 'budget-denied');
  assert.equal(harness.getCallCount(), 0);
});

test('kill-switch enforcement: an engaged kill switch denies the call before invoking the model', async () => {
  const harness = new GlmPilotSandboxHarness();
  harness.engageKillSwitch();
  const outcome = await harness.classify(
    fixtures.residentialRoofWashRequest,
    fixedResponseMock(fixtures.residentialRoofWashResponse),
  );
  assert.equal(outcome.status, 'provider-disabled');
  assert.equal(harness.getCallCount(), 0);
});

test('disabled health status also denies the call before invoking the model', async () => {
  const harness = new GlmPilotSandboxHarness();
  harness.disableHealth();
  const outcome = await harness.classify(
    fixtures.residentialRoofWashRequest,
    fixedResponseMock(fixtures.residentialRoofWashResponse),
  );
  assert.equal(outcome.status, 'provider-disabled');
  assert.equal(harness.getCallCount(), 0);
});

test('secret redaction: an unexpected secret-shaped field never appears in the audit trail, and the malformed response is rejected', async () => {
  const harness = new GlmPilotSandboxHarness();
  const outcome = await harness.classify(
    fixtures.residentialRoofWashRequest,
    fixedResponseMock(fixtures.malformedResponseWithSecret),
  );
  assert.equal(outcome.status, 'invalid-response');

  const serializedAuditLog = JSON.stringify(harness.getAuditEvents());
  assert.ok(!serializedAuditLog.includes('sk-should-never-appear-in-logs'));
  assert.ok(serializedAuditLog.includes('[redacted]'));
});

test('audit logging: every outcome produces at least one audit event scoped to this task', async () => {
  const harness = new GlmPilotSandboxHarness();
  await harness.classify(
    fixtures.residentialRoofWashRequest,
    fixedResponseMock(fixtures.residentialRoofWashResponse),
  );
  const scoped = harness
    .getAuditEvents()
    .filter((e) => e.taskId === fixtures.residentialRoofWashRequest.taskId);
  assert.ok(scoped.length > 0);
});

test('timeout behavior: a hanging model call is bounded by the configured timeout, not left to hang forever', async () => {
  const harness = new GlmPilotSandboxHarness();
  const outcome = await harness.classify(
    fixtures.residentialRoofWashRequest,
    hangingMock(),
    FAST_BUDGET,
  );
  assert.equal(outcome.status, 'timeout');
  assert.equal(outcome.attempts, FAST_BUDGET.maxRetries + 1);
});

test('deterministic bounded retry: a persistently failing call retries a fixed number of times, then fails closed without calling any other provider', async () => {
  const harness = new GlmPilotSandboxHarness();
  const outcome = await harness.classify(
    fixtures.residentialRoofWashRequest,
    throwingMock('simulated persistent failure'),
    FAST_BUDGET,
  );
  assert.equal(outcome.status, 'retry-exhausted');
  assert.equal(outcome.attempts, FAST_BUDGET.maxRetries + 1);
  assert.equal(harness.getCallCount(), FAST_BUDGET.maxRetries + 1);
  assert.deepEqual(harness.getDistinctProviderActors(), ['zai-glm']);
});

test('single-task cost cap: an artificially tiny cap flags costCapExceeded without blocking the classification', async () => {
  const harness = new GlmPilotSandboxHarness({
    ...GLM_PILOT_BUDGET_DEFAULTS,
    maxSingleTaskCostUsd: 0.0000001,
  });
  const outcome = await harness.classify(
    fixtures.residentialRoofWashRequest,
    fixedResponseMock(fixtures.residentialRoofWashResponse),
  );
  assert.equal(outcome.status, 'success');
  assert.equal(outcome.costCapExceeded, true);
});
