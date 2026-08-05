import type { APIRoute } from 'astro';
import {
  createSupabaseReviewRequestRepository,
  createSupabaseAuditLogRepository,
} from '@ai-company-os/db';
import { getCurrentMembership } from '../../../../lib/auth/membership';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, params, redirect }) => {
  const { id } = params;
  const user = locals.user!;
  const membership = await getCurrentMembership(locals.supabase, user.id);

  if (!membership || !id) {
    return redirect('/jobs');
  }

  const form = await request.formData();
  const jobId = form.get('jobId');
  const redirectTo = typeof jobId === 'string' && jobId.length > 0 ? `/jobs/${jobId}` : '/jobs';

  const auditLog = createSupabaseAuditLogRepository(locals.supabase);
  const reviewRequests = createSupabaseReviewRequestRepository(locals.supabase, auditLog);

  const result = await reviewRequests.transitionReviewRequestStatusForRoles(
    membership.businessId,
    id,
    'opted-out',
    membership.roles,
    {
      actorId: user.id,
      occurredAt: new Date().toISOString(),
    },
  );

  if (!result.ok) {
    return redirect(`${redirectTo}?error=${encodeURIComponent(result.error)}`);
  }
  if (result.result.outcome === 'rejected') {
    return redirect(`${redirectTo}?error=${encodeURIComponent(result.result.reason)}`);
  }

  return redirect(redirectTo);
};
