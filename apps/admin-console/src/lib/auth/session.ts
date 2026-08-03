import type { SupabaseClient, User } from '@supabase/supabase-js';

/**
 * `getUser()`, not `getSession()` - the former re-validates the JWT
 * against Supabase Auth on every call rather than trusting whatever the
 * cookie claims, per Supabase's own SSR security guidance.
 */
export async function getAuthenticatedUser(supabase: SupabaseClient): Promise<User | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return data.user;
}
