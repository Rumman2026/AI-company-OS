import type { SupabaseClient } from '@supabase/supabase-js';
import type { MembershipRole } from '@ai-company-os/db';

export interface CurrentMembership {
  businessId: string;
  businessName: string;
  /**
   * Every role this user holds for this business - may contain more
   * than one (e.g. `['owner-admin', 'office-manager']`), see
   * DECISIONS.md ADR-0018. Always non-empty for a resolved membership.
   */
  roles: MembershipRole[];
}

/**
 * Resolves the authenticated user's business/roles from the real
 * `memberships`/`membership_roles`/`businesses` tables - never from a
 * query parameter, form field, or request body (see DECISIONS.md
 * ADR-0011's tenant-escalation note). Relies entirely on RLS
 * (`memberships_own_select`, `membership_roles_own_select`,
 * `businesses_member_select`) to scope the result to the calling user;
 * this function adds no extra filtering of its own beyond those RLS
 * policies already enforcing `user_id = auth.uid()`.
 *
 * Falls back to the legacy single `memberships.role` column when
 * `membership_roles` has no rows for this membership yet - this is the
 * expected state until `packages/db/migrations/007-multi-role-memberships.sql`
 * has been run (an owner action, queued at the time this fallback was
 * written) - so an unmigrated Supabase project keeps working exactly as
 * before, never silently resolving to zero roles.
 *
 * A user with multiple memberships (across different businesses) gets
 * the first one, ordered by `created_at` - multi-business membership
 * selection (a business switcher) remains out of scope.
 */
export async function getCurrentMembership(
  supabase: SupabaseClient,
  userId: string,
): Promise<CurrentMembership | null> {
  // Unconditional, before any query or early return - if this line is
  // ever absent from Vercel's runtime logs for a request that reaches
  // this function, the deployed build does not contain this code path
  // at all (stale deployment/build cache), which is a different problem
  // than anything the branches below can diagnose.
  console.log('getCurrentMembership: called', { userId });

  const { data, error } = await supabase
    .from('memberships')
    .select('id, business_id, role, businesses(name), membership_roles(role)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    // Distinguish a real query/RLS failure from "this user genuinely has
    // no membership row" - both used to collapse into an identical null
    // return and an identical "no business membership yet" message,
    // which made a real production incident undiagnosable from the
    // outside. This is the only place that failure reason is ever
    // visible - check Vercel runtime logs for this line.
    console.error('getCurrentMembership: memberships query failed', {
      userId,
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return null;
  }
  if (!data) {
    console.error('getCurrentMembership: no memberships row for this user_id', { userId });
    return null;
  }

  const business = Array.isArray(data.businesses) ? data.businesses[0] : data.businesses;
  if (!business) {
    // A memberships row was found but its embedded businesses(name)
    // join came back empty - almost always an RLS gap on `businesses`
    // (businesses_member_select), not a missing row, since business_id
    // on `memberships` is a non-null foreign key.
    console.error('getCurrentMembership: memberships row found but businesses join was empty', {
      userId,
      membershipId: data.id,
      businessId: data.business_id,
    });
    return null;
  }

  const rolesFromChildTable = Array.isArray(data.membership_roles)
    ? (data.membership_roles as Array<{ role: MembershipRole }>).map((r) => r.role)
    : [];
  const roles =
    rolesFromChildTable.length > 0 ? rolesFromChildTable : [data.role as MembershipRole];

  console.log('getCurrentMembership: resolved', {
    userId,
    businessId: data.business_id,
    roles,
  });

  return {
    businessId: data.business_id as string,
    businessName: (business as { name: string }).name,
    roles: [...new Set(roles)],
  };
}
