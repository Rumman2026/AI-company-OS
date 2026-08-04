export interface SupabaseEnv {
  url: string;
  anonKey: string;
}

/**
 * The same Supabase project apps/greencal-website's quote-form and
 * packages/db's CRM tables live in - see DECISIONS.md ADR-0011. Uses the
 * ANON key, never the service-role key: every query in this app must go
 * through RLS (see ADR-0010), not bypass it.
 */
export function getSupabaseEnv(): SupabaseEnv | null {
  const url = import.meta.env.SUPABASE_URL;
  const anonKey = import.meta.env.SUPABASE_ANON_KEY;
  if (typeof url !== 'string' || url.length === 0) return null;
  if (typeof anonKey !== 'string' || anonKey.length === 0) return null;
  return { url, anonKey };
}

export interface SupabaseServiceRoleEnv {
  url: string;
  serviceRoleKey: string;
}

/**
 * Server-only, deliberately narrow: used by exactly one route,
 * src/pages/api/public/estimates/[token]/approve.ts (and the matching
 * public GET page), to look up an Estimate by its public
 * customer-approval token with no authenticated tenant session
 * present - see DECISIONS.md ADR-0030. Mirrors
 * apps/greencal-website's public quote-intake pattern (same trusted-
 * server-only service-role usage). Never call this from anywhere a
 * request isn't already scoped to that one token-based lookup -
 * everywhere else in this app must keep using getSupabaseEnv()'s
 * anon-key, RLS-enforced client.
 */
export function getSupabaseServiceRoleEnv(): SupabaseServiceRoleEnv | null {
  const url = import.meta.env.SUPABASE_URL;
  const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
  if (typeof url !== 'string' || url.length === 0) return null;
  if (typeof serviceRoleKey !== 'string' || serviceRoleKey.length === 0) return null;
  return { url, serviceRoleKey };
}
