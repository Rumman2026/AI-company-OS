import { test, expect } from '@playwright/test';
import {
  parseDollarsToMinorUnits,
  formatMinorUnitsAsDollars,
} from '../src/lib/estimates/parse-amount';

test.describe('parseDollarsToMinorUnits', () => {
  test('parses whole dollar amounts', () => {
    expect(parseDollarsToMinorUnits('450')).toBe(45000);
    expect(parseDollarsToMinorUnits('0')).toBe(0);
  });

  test('parses cents correctly, including a single fraction digit', () => {
    expect(parseDollarsToMinorUnits('450.50')).toBe(45050);
    expect(parseDollarsToMinorUnits('450.5')).toBe(45050);
    expect(parseDollarsToMinorUnits('450.05')).toBe(45005);
  });

  test('rejects malformed input rather than guessing', () => {
    expect(parseDollarsToMinorUnits('abc')).toBe(null);
    expect(parseDollarsToMinorUnits('-50')).toBe(null);
    expect(parseDollarsToMinorUnits('450.505')).toBe(null);
    expect(parseDollarsToMinorUnits('')).toBe(null);
    expect(parseDollarsToMinorUnits('$450')).toBe(null);
  });
});

test.describe('formatMinorUnitsAsDollars', () => {
  test('formats USD with a dollar sign', () => {
    expect(formatMinorUnitsAsDollars(45050, 'USD')).toBe('$450.50');
  });

  test('formats a non-USD currency with a trailing code', () => {
    expect(formatMinorUnitsAsDollars(45050, 'CAD')).toBe('450.50 CAD');
  });
});
