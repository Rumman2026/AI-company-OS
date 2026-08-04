export const PUBLIC_PATH_PREFIXES = [
  '/login',
  '/forgot-password',
  '/reset-password',
  '/api/auth/login',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/auth/callback',
  /**
   * The public customer estimate-approval link - see DECISIONS.md
   * ADR-0030. Unauthenticated by design: a customer has no admin
   * account. Every route under these two prefixes must authorize
   * itself solely via the estimate's own unguessable token (never via
   * `context.locals.user`, which is never set for a public path) and
   * must use the service-role client from
   * src/lib/supabase/env.ts's getSupabaseServiceRoleEnv() - see that
   * file's doc comment for why.
   */
  '/approve',
  '/api/public/estimates',
] as const;

/** Routes reachable without an authenticated session - see middleware.ts. */
export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}
