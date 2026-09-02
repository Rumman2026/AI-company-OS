import type { APIRoute } from 'astro';
import {
  createSupabaseLeadRepository,
  createUserScopedAuditLogRepository,
} from '@ai-company-os/db';
import { getCurrentMembership } from '../../../../lib/auth/membership';

export const prerender = false;

export const POST: APIRoute = async ({ locals, params, redirect }) => {
  const { id } = params;
  const user = locals.user!;
  const membership = await getCurrentMembership(locals.supabase, user.id);

  if (!membership || !id) {
    return redirect('/leads');
  }

  const auditLog = createUserScopedAuditLogRepository(locals.supabase);
  const leads = createSupabaseLeadRepository(locals.supabase, auditLog);
  const result = await leads.restoreLead(membership.businessId, id);

  if (!result.ok) {
    return redirect(`/leads/${id}?error=${encodeURIComponent(result.error)}`);
  }

  return redirect(`/leads/${id}`);
};
