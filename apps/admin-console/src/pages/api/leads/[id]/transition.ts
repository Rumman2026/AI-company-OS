import type { APIRoute } from 'astro';
import { createSupabaseLeadRepository, createSupabaseAuditLogRepository } from '@ai-company-os/db';
import { getCurrentMembership } from '../../../../lib/auth/membership';
import { isValidLeadStatus } from '../../../../lib/leads/validate-status';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, params, redirect }) => {
  const { id } = params;
  const user = locals.user!;
  const membership = await getCurrentMembership(locals.supabase, user.id);

  if (!membership || !id) {
    return redirect('/leads');
  }

  const form = await request.formData();
  const requestedStatus = form.get('requestedStatus');
  const reason = form.get('reason');

  if (!isValidLeadStatus(requestedStatus)) {
    return redirect(`/leads/${id}?error=invalid-status`);
  }

  const auditLog = createSupabaseAuditLogRepository(locals.supabase);
  const leadRepo = createSupabaseLeadRepository(locals.supabase, auditLog);

  const result = await leadRepo.transitionLeadStatusForRoles(
    membership.businessId,
    id,
    requestedStatus,
    membership.roles,
    {
      actorId: user.id,
      occurredAt: new Date().toISOString(),
      reason: typeof reason === 'string' && reason.length > 0 ? reason : undefined,
    },
  );

  if (!result.ok) {
    return redirect(`/leads/${id}?error=${encodeURIComponent(result.error)}`);
  }
  if (result.result.outcome === 'rejected') {
    return redirect(`/leads/${id}?error=${encodeURIComponent(result.result.reason)}`);
  }

  return redirect(`/leads/${id}`);
};
