import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { LeadStatus } from '@ai-company-os/core-models';
import { leadStatusTone } from '../src/lead-status-tone';

const ALL_STATUSES: LeadStatus[] = [
  'new',
  'contact-attempted',
  'contacted',
  'qualified',
  'disqualified',
  'estimate-requested',
  'estimate-sent',
  'booked',
  'lost',
  'spam',
  'duplicate',
];

test('every LeadStatus maps to a defined tone', () => {
  for (const status of ALL_STATUSES) {
    assert.ok(leadStatusTone(status), `missing tone for status "${status}"`);
  }
});

test('terminal negative outcomes are never tone "success"', () => {
  for (const status of ['lost', 'spam', 'duplicate', 'disqualified'] as const) {
    assert.notEqual(leadStatusTone(status), 'success');
  }
});

test('positive-progress statuses are tone "success"', () => {
  for (const status of ['qualified', 'estimate-requested', 'estimate-sent', 'booked'] as const) {
    assert.equal(leadStatusTone(status), 'success');
  }
});
