import type { SupabaseClient } from '@supabase/supabase-js';
import type { MembershipRole } from '@ai-company-os/db';

export interface CurrentMembership {
  businessId: string;
  businessName: string;
  role: MembershipRole;
}

/**
 * Resolves the authenticated user's business/role from the real
 * `memberships`/`businesses` tables - never from a query parameter, form
 * field, or request body (see DECISIONS.md ADR-0011's tenant-escalation
 * note). Relies entirely on RLS (`memberships_own_select`,
 * `businesses_member_select`) to scope the result to the calling user;
 * this function adds no extra filtering of its own beyond that RLS
 * policy already enforcing `user_id = auth.uid()`.
 *
 * A user with multiple memberships gets the first one, ordered by
 * `created_at` - multi-business membership selection (a business
 * switcher) is out of scope for this milestone.
 */
export async function getCurrentMembership(
  supabase: SupabaseClient,
  userId: string,
): Promise<CurrentMembership | null> {
  const { data, error } = await supabase
    .from('memberships')
    .select('business_id, role, businesses(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  const business = Array.isArray(data.businesses) ? data.businesses[0] : data.businesses;
  if (!business) return null;

  return {
    businessId: data.business_id as string,
    businessName: (business as { name: string }).name,
    role: data.role as MembershipRole,
  };
}
