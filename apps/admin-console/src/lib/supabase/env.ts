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
