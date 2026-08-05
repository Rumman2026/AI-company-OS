import { test, expect } from '@playwright/test';
import {
  formatDateTime,
  formatDate,
  formatTime,
  formatDateLong,
  DEFAULT_TIME_ZONE,
} from '../src/lib/format-datetime';

// 2026-08-05T09:23:00.000Z is the exact production incident this
// module fixes: displayed as "9:23 AM" (UTC) instead of the correct
// California local time. August is daylight saving (PDT, UTC-7), so
// the correct local time is 2:23 AM - not a fixed UTC-7 offset
// applied blindly, but what Intl's IANA tzdata resolves for this
// specific date.
const DST_TIMESTAMP = '2026-08-05T09:23:00.000Z';

// 2026-01-15T09:23:00.000Z falls in standard time (PST, UTC-8) for
// America/Los_Angeles - the other half of the year this module must
// get right without a hard-coded offset.
const STANDARD_TIME_TIMESTAMP = '2026-01-15T09:23:00.000Z';

test.describe('DEFAULT_TIME_ZONE', () => {
  test('is the GreenCal operating timezone, as an IANA name, never a fixed offset', () => {
    expect(DEFAULT_TIME_ZONE).toBe('America/Los_Angeles');
  });
});

test.describe('formatDateTime', () => {
  test('resolves a daylight-saving-time (PDT) timestamp to the correct local time and zone label', () => {
    const result = formatDateTime(DST_TIMESTAMP);
    expect(result).toContain('2:23 AM');
    expect(result).toContain('PDT');
  });

  test('resolves a standard-time (PST) timestamp to the correct local time and zone label', () => {
    const result = formatDateTime(STANDARD_TIME_TIMESTAMP);
    expect(result).toContain('1:23 AM');
    expect(result).toContain('PST');
  });

  test('accepts an explicit timezone override for a future business-configured zone', () => {
    const result = formatDateTime(DST_TIMESTAMP, 'America/New_York');
    expect(result).toContain('5:23 AM');
    expect(result).toContain('EDT');
  });
});

test.describe('formatTime', () => {
  test('resolves DST correctly, matching the exact production incident', () => {
    const result = formatTime(DST_TIMESTAMP);
    expect(result).toContain('2:23 AM');
    expect(result).toContain('PDT');
  });

  test('resolves standard time correctly', () => {
    const result = formatTime(STANDARD_TIME_TIMESTAMP);
    expect(result).toContain('1:23 AM');
    expect(result).toContain('PST');
  });
});

test.describe('formatDate', () => {
  test('resolves the date in the target timezone, not UTC', () => {
    // 2026-08-05T09:23:00.000Z is 2026-08-05 in both UTC and
    // America/Los_Angeles for this specific time - the meaningful
    // case is near-midnight UTC, covered below.
    expect(formatDate(DST_TIMESTAMP)).toBe('8/5/2026');
  });

  test('a timestamp just after UTC midnight resolves to the previous day in Pacific time', () => {
    // 2026-08-05T02:00:00.000Z is 2026-08-04T19:00:00 PDT - the exact
    // class of off-by-one-day bug a naive UTC render would produce.
    expect(formatDate('2026-08-05T02:00:00.000Z')).toBe('8/4/2026');
  });
});

test.describe('formatDateLong', () => {
  test('formats a full weekday/month/day/year string in the target timezone', () => {
    expect(formatDateLong(DST_TIMESTAMP)).toBe('Wednesday, August 5, 2026');
  });
});
