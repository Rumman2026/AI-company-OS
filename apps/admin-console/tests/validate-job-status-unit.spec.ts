import { test, expect } from '@playwright/test';
import { isValidJobStatus } from '../src/lib/jobs/validate-status';

test.describe('isValidJobStatus', () => {
  test('accepts every real JobStatus value', () => {
    const valid = [
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
    for (const status of valid) {
      expect(isValidJobStatus(status)).toBe(true);
    }
  });

  test('rejects an arbitrary string and non-string values', () => {
    expect(isValidJobStatus('not-a-real-status')).toBe(false);
    expect(isValidJobStatus('')).toBe(false);
    expect(isValidJobStatus(null)).toBe(false);
    expect(isValidJobStatus(undefined)).toBe(false);
    expect(isValidJobStatus(42)).toBe(false);
  });
});
