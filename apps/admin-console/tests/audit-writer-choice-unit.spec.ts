import { test, expect } from '@playwright/test';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Every audit write in this app must go through the SECURITY DEFINER function.
 *
 * The admin console builds a COOKIE-SCOPED client per request
 * (`createSupabaseServerClient`, publishable key + the user's session), so
 * `auth.uid()` is the signed-in user and `audit_log` grants them no INSERT at
 * all. `createSupabaseAuditLogRepository` inserts directly and only works for
 * the service-role key - handing it a user client is the exact defect migration
 * 044 exists to end, and it fails SILENTLY unless someone checks the result.
 *
 * This test exists because that mistake was made here once already: the first
 * pass at the fix converted `src/pages/api/**\/*.ts` and missed all eleven
 * `.astro` pages, which construct the repository in their frontmatter. A grep
 * with the wrong --include is not a thing a reviewer notices.
 */

const SRC = join(__dirname, '..', 'src');

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

test('no admin-console file uses the service-role audit writer', () => {
  const offenders = walk(SRC)
    .filter((f) => /\.(ts|tsx|astro)$/.test(f))
    .filter((f) => readFileSync(f, 'utf-8').includes('createSupabaseAuditLogRepository'))
    .map((f) => f.slice(SRC.length + 1));

  expect(
    offenders,
    'these files must use createUserScopedAuditLogRepository - the console has no ' +
      'service-role key, so a direct audit_log INSERT is refused with 42501 and, ' +
      'historically, thrown away',
  ).toEqual([]);
});

test('the pages that write audit records use the user-scoped writer', () => {
  // The positive half: proves the assertion above is not passing merely because
  // nothing constructs an audit repository at all any more.
  const users = walk(SRC)
    .filter((f) => /\.(ts|tsx|astro)$/.test(f))
    .filter((f) => readFileSync(f, 'utf-8').includes('createUserScopedAuditLogRepository'));

  expect(users.length).toBeGreaterThan(10);
});
