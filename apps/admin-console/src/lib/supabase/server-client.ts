import { createServerClient, parseCookieHeader, type CookieOptions } from '@supabase/ssr';
import type { AstroCookies } from 'astro';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseEnv } from './env';

/**
 * A per-request Supabase client bound to the incoming request's session
 * cookies. Uses the anon key (see env.ts) so every query this app makes
 * is subject to ADR-0010's tenant-scoped RLS policies - unlike
 * packages/db's service-role-based repositories, which bypass RLS by
 * design for GreenCal's trusted intake path.
 */
export function createSupabaseServerClient(
  request: Request,
  cookies: AstroCookies,
): SupabaseClient | null {
  const env = getSupabaseEnv();
  if (!env) return null;

  return createServerClient(env.url, env.anonKey, {
    cookies: {
      getAll() {
        return parseCookieHeader(request.headers.get('cookie') ?? '');
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
        for (const { name, value, options } of cookiesToSet) {
          cookies.set(name, value, options);
        }
      },
    },
  });
}
