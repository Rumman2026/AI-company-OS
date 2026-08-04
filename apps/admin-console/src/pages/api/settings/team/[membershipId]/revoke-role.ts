import type { APIRoute } from 'astro';
import { createSupabaseTeamRosterRepository, type MembershipRole } from '@ai-company-os/db';
import { getCurrentMembership } from '../../../../../lib/auth/membership';

export const prerender = false;

const VALID_ROLES: MembershipRole[] = ['owner-admin', 'office-manager', 'dispatcher', 'technician'];

export const POST: APIRoute = async ({ request, locals, params, redirect }) => {
  const { membershipId } = params;
  const user = locals.user!;
  const membership = await getCurrentMembership(locals.supabase, user.id);

  if (!membership || !membershipId) {
    return redirect('/settings');
  }

  const form = await request.formData();
  const roleInput = form.get('role');
  const role = typeof roleInput === 'string' ? (roleInput as MembershipRole) : null;

  if (!role || !VALID_ROLES.includes(role)) {
    return redirect('/settings/team?error=invalid-role');
  }

  const repo = createSupabaseTeamRosterRepository(locals.supabase);
  const result = await repo.revokeRole(membership.businessId, membershipId, role, membership.roles);

  if (!result.ok) {
    return redirect(`/settings/team?error=${encodeURIComponent(result.error)}`);
  }

  return redirect('/settings/team');
};
