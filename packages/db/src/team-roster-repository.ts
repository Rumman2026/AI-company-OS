import type { MembershipRole } from './membership-types';
import type { MinimalSupabaseClient } from './supabase-client';

/** Deliberately packages/db-only, mirroring BusinessProfile/MembershipRole - see those files' doc comments. */
export interface TeamMember {
  readonly membershipId: string;
  readonly userId: string;
  readonly email?: string;
  readonly roles: MembershipRole[];
}

export type ListTeamRosterResult =
  { ok: true; members: TeamMember[] } | { ok: false; error: string };
export type GrantRoleResult = { ok: true } | { ok: false; error: string };
export type RevokeRoleResult = { ok: true } | { ok: false; error: string };

export interface TeamRosterRepository {
  /** Every membership in this business, each with its resolved role list - see DECISIONS.md ADR-0032. */
  listTeamRoster(businessId: string): Promise<ListTeamRosterResult>;
  /**
   * Grants `role` to `membershipId` - rejects (does not throw) unless
   * `actingUserRoles` includes `owner-admin` (real enforcement is the
   * matching RLS policy; this check exists for a clean error message).
   */
  grantRole(
    businessId: string,
    membershipId: string,
    role: MembershipRole,
    actingUserRoles: readonly MembershipRole[],
  ): Promise<GrantRoleResult>;
  /**
   * Revokes `role` from `membershipId` - same owner-admin-only rule as
   * grantRole, plus rejects an attempt to remove the business's last
   * remaining `owner-admin` (would otherwise permanently lock every
   * team member out of granting roles at all - an irreversible
   * mistake this repository refuses to allow).
   */
  revokeRole(
    businessId: string,
    membershipId: string,
    role: MembershipRole,
    actingUserRoles: readonly MembershipRole[],
  ): Promise<RevokeRoleResult>;
}

interface MembershipRow {
  id: string;
  user_id: string;
  user_email: string | null;
  role: MembershipRole;
}

interface MembershipRoleRow {
  membership_id: string;
  role: MembershipRole;
}

export function createSupabaseTeamRosterRepository(
  client: MinimalSupabaseClient,
): TeamRosterRepository {
  async function fetchRoster(businessId: string): Promise<ListTeamRosterResult> {
    const { data: membershipData, error: membershipError } = await client
      .from('memberships')
      .select('id, user_id, user_email, role')
      .eq('business_id', businessId);

    if (membershipError || !membershipData) {
      return { ok: false, error: membershipError?.message ?? 'team_roster_list_failed' };
    }

    const memberships = membershipData as MembershipRow[];
    const membershipIds = memberships.map((m) => m.id);

    const { data: roleData, error: roleError } = await client
      .from('membership_roles')
      .select('membership_id, role')
      .in('membership_id', membershipIds);

    if (roleError || !roleData) {
      return { ok: false, error: roleError?.message ?? 'team_roster_list_failed' };
    }

    const rolesByMembership = new Map<string, MembershipRole[]>();
    for (const row of roleData as MembershipRoleRow[]) {
      const existing = rolesByMembership.get(row.membership_id) ?? [];
      existing.push(row.role);
      rolesByMembership.set(row.membership_id, existing);
    }

    const members: TeamMember[] = memberships.map((m) => ({
      membershipId: m.id,
      userId: m.user_id,
      email: m.user_email ?? undefined,
      roles: rolesByMembership.get(m.id) ?? [m.role],
    }));

    return { ok: true, members };
  }

  return {
    async listTeamRoster(businessId) {
      return fetchRoster(businessId);
    },

    async grantRole(businessId, membershipId, role, actingUserRoles) {
      if (!actingUserRoles.includes('owner-admin')) {
        return { ok: false, error: 'not_authorized_owner_admin_required' };
      }

      const { data: targetMembership, error: lookupError } = await client
        .from('memberships')
        .select('id')
        .eq('id', membershipId)
        .eq('business_id', businessId)
        .single();

      if (lookupError || !targetMembership) {
        return { ok: false, error: lookupError?.message ?? 'membership_not_found' };
      }

      const { error } = await client
        .from('membership_roles')
        .insert({ membership_id: membershipId, role });

      if (error) {
        return { ok: false, error: error.message ?? 'grant_role_failed' };
      }
      return { ok: true };
    },

    async revokeRole(businessId, membershipId, role, actingUserRoles) {
      if (!actingUserRoles.includes('owner-admin')) {
        return { ok: false, error: 'not_authorized_owner_admin_required' };
      }

      if (role === 'owner-admin') {
        const rosterResult = await fetchRoster(businessId);
        if (!rosterResult.ok) {
          return { ok: false, error: rosterResult.error };
        }
        const otherOwnerAdmins = rosterResult.members.filter(
          (m) => m.membershipId !== membershipId && m.roles.includes('owner-admin'),
        );
        if (otherOwnerAdmins.length === 0) {
          return { ok: false, error: 'cannot_remove_last_owner_admin' };
        }
      }

      const { error } = await client
        .from('membership_roles')
        .delete()
        .eq('membership_id', membershipId)
        .eq('role', role);

      if (error) {
        return { ok: false, error: error.message ?? 'revoke_role_failed' };
      }
      return { ok: true };
    },
  };
}
