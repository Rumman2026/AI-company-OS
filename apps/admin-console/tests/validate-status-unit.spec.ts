import { test, expect } from '@playwright/test';
import { isValidLeadStatus } from '../src/lib/leads/validate-status';

test.describe('isValidLeadStatus', () => {
  test('accepts every real LeadStatus value', () => {
    const valid = [
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
    for (const status of valid) {
      expect(isValidLeadStatus(status)).toBe(true);
    }
  });

  test('rejects an arbitrary string, never trusting raw form input', () => {
    expect(isValidLeadStatus('not-a-real-status')).toBe(false);
    expect(isValidLeadStatus('')).toBe(false);
    expect(isValidLeadStatus('NEW')).toBe(false);
  });

  test('rejects non-string values', () => {
    expect(isValidLeadStatus(null)).toBe(false);
    expect(isValidLeadStatus(undefined)).toBe(false);
    expect(isValidLeadStatus(123)).toBe(false);
    expect(isValidLeadStatus(['new'])).toBe(false);
  });
});
