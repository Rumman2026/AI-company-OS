import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createLeadId,
  createJobId,
  createPublishedProjectSlug,
  createCorrelationId,
} from '../src/ids';
import { DomainValidationError } from '../src/primitives';

test('id constructors brand a valid, non-empty string', () => {
  const leadId = createLeadId('lead-123');
  assert.equal(leadId, 'lead-123');
});

test('id constructors are deterministic - same input produces an equal value', () => {
  assert.equal(createLeadId('lead-abc'), createLeadId('lead-abc'));
});

test('different fixture ids for different entities are distinct values', () => {
  const leadId = createLeadId('lead-1');
  const jobId = createJobId('job-1');
  assert.notEqual(String(leadId), String(jobId));
});

const invalidValues = ['', '   ', ' lead-1', 'lead-1 '];
for (const value of invalidValues) {
  test(`id constructor rejects invalid value: ${JSON.stringify(value)}`, () => {
    assert.throws(() => createLeadId(value), DomainValidationError);
  });
}

test('id constructor rejects non-string input at the runtime boundary', () => {
  // @ts-expect-error intentionally passing a non-string to exercise the runtime guard
  assert.throws(() => createLeadId(123), DomainValidationError);
});

test('slug constructor accepts a lowercase hyphenated value', () => {
  const slug = createPublishedProjectSlug('roof-cleaning-example-2026');
  assert.equal(slug, 'roof-cleaning-example-2026');
});

const invalidSlugs = ['Roof-Cleaning', 'roof_cleaning', 'roof cleaning', '-roof', 'roof-', ''];
for (const value of invalidSlugs) {
  test(`slug constructor rejects invalid value: ${JSON.stringify(value)}`, () => {
    assert.throws(() => createPublishedProjectSlug(value), DomainValidationError);
  });
}

test('a public slug and an internal id constructed from the same raw string remain independently usable values', () => {
  const raw = 'roof-cleaning-example';
  const slug = createPublishedProjectSlug(raw);
  const correlationId = createCorrelationId(raw);
  assert.equal(String(slug), String(correlationId));
  // Runtime cannot express type-level separation - see
  // src/type-tests/ids.type-test.ts for the compile-time guarantee that
  // these two branded types are never assignable to one another.
});
