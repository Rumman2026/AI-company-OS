/**
 * Rejects a SUPABASE_URL that already has a path segment baked in (e.g.
 * a value copy-pasted as "https://xxx.supabase.co/rest/v1" instead of
 * "https://xxx.supabase.co"). Both createServerClient() (@supabase/ssr)
 * and createClient() (@supabase/supabase-js) append "/auth/v1/..."
 * themselves - passing a URL that already ends in "/rest/v1" silently
 * produces requests to ".../rest/v1/auth/v1/recover" instead of
 * ".../auth/v1/recover", a real production incident this project hit
 * once already. Treating it as unconfigured (same as an empty value)
 * makes the failure an honest "not configured" 503 instead of a
 * confusing 404 from the wrong endpoint.
 */
export function isPlausibleSupabaseUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' && (parsed.pathname === '' || parsed.pathname === '/');
  } catch {
    return false;
  }
}
