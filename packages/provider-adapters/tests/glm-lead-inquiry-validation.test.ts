import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateLeadInquiryClassificationRequest,
  validateLeadInquiryClassificationResult,
  findForbiddenClaims,
} from '../src/glm-lead-inquiry/validation';
import {
  residentialRoofWashRequest,
  residentialRoofWashResponse,
} from '../src/glm-lead-inquiry/fixtures';

test('validateLeadInquiryClassificationRequest accepts a well-formed request', () => {
  const result = validateLeadInquiryClassificationRequest(residentialRoofWashRequest);
  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
});

test('validateLeadInquiryClassificationRequest rejects a missing inquiryText', () => {
  const result = validateLeadInquiryClassificationRequest({
    taskId: 't1',
    inquiryText: '',
    contactChannel: 'email',
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('inquiryText')));
});

test('validateLeadInquiryClassificationRequest rejects an unknown contactChannel', () => {
  const result = validateLeadInquiryClassificationRequest({
    taskId: 't1',
    inquiryText: 'hello',
    contactChannel: 'carrier-pigeon',
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('contactChannel')));
});

test('validateLeadInquiryClassificationRequest rejects an overlong inquiryText', () => {
  const result = validateLeadInquiryClassificationRequest({
    taskId: 't1',
    inquiryText: 'x'.repeat(9000),
    contactChannel: 'email',
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('exceeds')));
});

test('findForbiddenClaims detects a dollar amount, a guarantee, and an availability promise', () => {
  assert.ok(findForbiddenClaims('That will be $150').length > 0);
  assert.ok(findForbiddenClaims('We guarantee the best results').length > 0);
  assert.ok(findForbiddenClaims('We are available today').length > 0);
  assert.deepEqual(findForbiddenClaims('We will summarize your request and follow up.'), []);
});

test('validateLeadInquiryClassificationResult accepts a well-formed response', () => {
  const result = validateLeadInquiryClassificationResult(residentialRoofWashResponse);
  assert.equal(result.valid, true);
  assert.deepEqual(result.value, residentialRoofWashResponse);
});

test('validateLeadInquiryClassificationResult rejects an out-of-range confidence', () => {
  const result = validateLeadInquiryClassificationResult({
    ...residentialRoofWashResponse,
    confidence: 1.5,
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('confidence')));
});

test('validateLeadInquiryClassificationResult rejects an unapproved recommendedTemplateId', () => {
  const result = validateLeadInquiryClassificationResult({
    ...residentialRoofWashResponse,
    recommendedTemplateId: 'made-up-template',
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('recommendedTemplateId')));
});

test('validateLeadInquiryClassificationResult rejects a forbidden claim inside summary', () => {
  const result = validateLeadInquiryClassificationResult({
    ...residentialRoofWashResponse,
    summary: 'We guarantee this will cost $150 and we can come today.',
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('forbidden claim')));
});

test('validateLeadInquiryClassificationResult rejects a forbidden claim inside missingInformation', () => {
  const result = validateLeadInquiryClassificationResult({
    ...residentialRoofWashResponse,
    missingInformation: ['We promise a free estimate'],
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('forbidden claim')));
});

test('validateLeadInquiryClassificationResult rejects an unknown escalationReasons value', () => {
  const result = validateLeadInquiryClassificationResult({
    ...residentialRoofWashResponse,
    escalationReasons: ['not-a-real-reason'],
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.some((e) => e.includes('escalationReasons')));
});
