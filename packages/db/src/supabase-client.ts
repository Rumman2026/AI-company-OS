import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * The narrow shape every repository in this package depends on, not the
 * full Supabase SDK type - keeps repositories testable with a simple fake
 * (see tests/*.test.ts), same pattern as
 * apps/greencal-website/src/lib/quote-form/lead-store.ts.
 */
export type MinimalSupabaseClient = Pick<SupabaseClient, 'from'>;

/**
 * Only ever constructed from a trusted server context with the
 * service-role key - never imported or instantiated from client-side
 * code. See migrations/001-crm-foundation.sql for the RLS model this
 * assumes (service-role bypasses RLS by design; no other role has any
 * policy).
 */
export function createDbClient(url: string, serviceRoleKey: string): MinimalSupabaseClient {
  return createClient(url, serviceRoleKey, { auth: { persistSession: false } });
}
