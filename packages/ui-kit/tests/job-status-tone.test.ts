import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { JobStatus } from '@ai-company-os/core-models';
import { jobStatusTone } from '../src/job-status-tone';

const ALL_STATUSES: JobStatus[] = [
  'draft',
  'scheduled',
  'assigned',
  'in-progress',
  'service-completed',
  'awaiting-office-review',
  'completed',
  'follow-up-required',
  'canceled',
];

test('every JobStatus maps to a defined tone', () => {
  for (const status of ALL_STATUSES) {
    assert.ok(jobStatusTone(status), `missing tone for status "${status}"`);
  }
});

test('canceled is tone "danger"', () => {
  assert.equal(jobStatusTone('canceled'), 'danger');
});

test('completed and service-completed are tone "success"', () => {
  assert.equal(jobStatusTone('completed'), 'success');
  assert.equal(jobStatusTone('service-completed'), 'success');
});
