import { test, expect } from '@playwright/test';
import { isValidInvoiceStatus } from '../src/lib/invoices/validate-status';

test.describe('isValidInvoiceStatus', () => {
  test('accepts every real InvoiceStatus value', () => {
    const valid = ['draft', 'sent', 'partially-paid', 'paid', 'overdue', 'voided', 'refunded'];
    for (const status of valid) {
      expect(isValidInvoiceStatus(status)).toBe(true);
    }
  });

  test('rejects an arbitrary string and non-string values', () => {
    expect(isValidInvoiceStatus('not-a-real-status')).toBe(false);
    expect(isValidInvoiceStatus('')).toBe(false);
    expect(isValidInvoiceStatus(null)).toBe(false);
    expect(isValidInvoiceStatus(undefined)).toBe(false);
    expect(isValidInvoiceStatus(42)).toBe(false);
  });
});
