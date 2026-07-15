import { test } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateConsentRevocation } from '../src/consent-effects';
import type { ConsentPurpose, ConsentStatus } from '../src/types/consent';
import { makeFixtureConsent } from '../src/fixtures';

const allPurposes: ConsentPurpose[] = [
  'service-communication',
  'marketing-communication',
  'review-request',
  'photo-publication',
  'project-description-publication',
  'city-publication',
  'customer-name-publication',
  'testimonial-publication',
];

const allStatuses: ConsentStatus[] = ['pending', 'granted', 'declined', 'revoked'];

test('every consent purpose and every consent status is representable', () => {
  for (const purpose of allPurposes) {
    for (const status of allStatuses) {
      const consent = makeFixtureConsent({ purpose, status });
      assert.equal(consent.purpose, purpose);
      assert.equal(consent.status, status);
    }
  }
});

test('revocation of a publication-related purpose never returns a no-op result', () => {
  const publicationPurposes: ConsentPurpose[] = [
    'photo-publication',
    'project-description-publication',
    'city-publication',
    'customer-name-publication',
    'testimonial-publication',
  ];
  for (const purpose of publicationPurposes) {
    const revoked = makeFixtureConsent({ purpose, status: 'revoked' });
    const evaluation = evaluateConsentRevocation(revoked);
    assert.ok(
      evaluation.requiredEffects.length > 0,
      `${purpose} revocation must require at least one effect`,
    );
    assert.ok(evaluation.requiredEffects.includes('unpublish-affected-content'));
  }
});

test('revocation of photo-publication specifically requires removing public photo derivatives', () => {
  const revoked = makeFixtureConsent({ purpose: 'photo-publication', status: 'revoked' });
  const evaluation = evaluateConsentRevocation(revoked);
  assert.ok(evaluation.requiredEffects.includes('remove-affected-photo-derivatives'));
});

test('revocation of review-request suppresses future review requests', () => {
  const revoked = makeFixtureConsent({ purpose: 'review-request', status: 'revoked' });
  const evaluation = evaluateConsentRevocation(revoked);
  assert.ok(evaluation.requiredEffects.includes('suppress-future-review-requests'));
});

test('revocation of marketing-communication suppresses future marketing communication', () => {
  const revoked = makeFixtureConsent({ purpose: 'marketing-communication', status: 'revoked' });
  const evaluation = evaluateConsentRevocation(revoked);
  assert.ok(evaluation.requiredEffects.includes('suppress-future-marketing-communication'));
});

test('every revocation records an audit action', () => {
  for (const purpose of allPurposes) {
    const revoked = makeFixtureConsent({ purpose, status: 'revoked' });
    const evaluation = evaluateConsentRevocation(revoked);
    assert.ok(evaluation.requiredEffects.includes('record-audit-action'));
  }
});

test('evaluating a revocation does not erase or rewrite the original consent record', () => {
  const revoked = makeFixtureConsent({
    purpose: 'photo-publication',
    status: 'revoked',
    supersedesConsentId: makeFixtureConsent().id,
  });
  const before = { ...revoked };
  evaluateConsentRevocation(revoked);
  assert.deepEqual(revoked, before);
});

test('evaluateConsentRevocation requires a record already in revoked status - it does not itself perform the revocation', () => {
  const granted = makeFixtureConsent({ status: 'granted' });
  assert.throws(() => evaluateConsentRevocation(granted));
});

test('historical consent facts remain representable via supersedesConsentId', () => {
  const original = makeFixtureConsent({ status: 'granted' });
  const revocation = makeFixtureConsent({ status: 'revoked', supersedesConsentId: original.id });
  assert.equal(revocation.supersedesConsentId, original.id);
});
