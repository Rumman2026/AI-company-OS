import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateEscalation, checkAuthority } from '../src/policy-engine';
import type { PolicyContext } from '../src/types';

const baseContext: PolicyContext = {
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

test('no escalation when nothing triggers it', () => {
  const decision = evaluateEscalation(baseContext);
  assert.equal(decision.escalate, false);
  assert.deepEqual(decision.reasons, []);
});

test('low confidence alone triggers escalation', () => {
  const decision = evaluateEscalation({ ...baseContext, confidence: 0.4 });
  assert.equal(decision.escalate, true);
  assert.deepEqual(decision.reasons, ['low-confidence']);
});

test('multiple triggers are all reported, not just the first', () => {
  const decision = evaluateEscalation({
    ...baseContext,
    customerSentiment: 'upset',
    isHighValueLead: true,
    affectsSecurityAuthInfraOrProduction: true,
  });
  assert.equal(decision.escalate, true);
  assert.deepEqual(decision.reasons, [
    'customer-upset',
    'high-value-lead',
    'security-auth-infra-or-production-code',
  ]);
});

test('checkAuthority blocks a non-owner from merging a pull request', () => {
  const result = checkAuthority('merge-pull-request', false);
  assert.equal(result.allowed, false);
  assert.ok(result.blockedReason);
});

test('checkAuthority allows the owner to perform any listed action', () => {
  const result = checkAuthority('deploy-production', true);
  assert.equal(result.allowed, true);
  assert.equal(result.blockedReason, null);
});

test('checkAuthority allows a non-owner to perform an unlisted routine action', () => {
  const result = checkAuthority('exceed-assigned-budget', false);
  assert.equal(result.allowed, false);
});
