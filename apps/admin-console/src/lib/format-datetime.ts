/**
 * Shared date/time display formatting for apps/admin-console. Every
 * timestamp is stored in the database as UTC (unchanged by this
 * module) - these functions convert only at render time, using an
 * IANA timezone name so `Intl.DateTimeFormat` resolves daylight-saving
 * transitions correctly from the timezone database itself. Never a
 * fixed offset (e.g. "UTC-7") - that would be wrong for half the
 * year.
 *
 * No `businesses.timezone` column exists in the schema yet (see
 * packages/db/migrations/018-business-profile.sql) - every call below
 * defaults to `DEFAULT_TIME_ZONE` until one is added. When it is, pass
 * the business's configured zone as the second argument instead of
 * relying on the default - no other change to these functions should
 * be needed.
 */

/** GreenCal's operating timezone - the only real tenant today. */
export const DEFAULT_TIME_ZONE = 'America/Los_Angeles';

const LOCALE = 'en-US';

/** "8/5/2026, 9:23 AM PDT" - full date and time, with a readable zone label. */
export function formatDateTime(iso: string, timeZone: string = DEFAULT_TIME_ZONE): string {
  return new Date(iso).toLocaleString(LOCALE, {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

/** "8/5/2026" - date only, resolved in the target timezone (matters near midnight). */
export function formatDate(iso: string, timeZone: string = DEFAULT_TIME_ZONE): string {
  return new Date(iso).toLocaleDateString(LOCALE, {
    timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  });
}

/** "9:23 AM PDT" - time only, with a readable zone label. */
export function formatTime(iso: string, timeZone: string = DEFAULT_TIME_ZONE): string {
  return new Date(iso).toLocaleTimeString(LOCALE, {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
}

/** "Wednesday, August 5, 2026" - used for grouping headers (e.g. Appointments by day). */
export function formatDateLong(iso: string, timeZone: string = DEFAULT_TIME_ZONE): string {
  return new Date(iso).toLocaleDateString(LOCALE, {
    timeZone,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
