import type { APIRoute } from 'astro';
import {
  createSupabaseReviewRequestRepository,
  createSupabaseAuditLogRepository,
} from '@ai-company-os/db';
import { getCurrentMembership } from '../../lib/auth/membership';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const user = locals.user!;
  const membership = await getCurrentMembership(locals.supabase, user.id);

  if (!membership) {
    return redirect('/jobs');
  }

  const form = await request.formData();
  const jobId = form.get('jobId');

  if (typeof jobId !== 'string' || jobId.length === 0) {
    return redirect('/jobs?error=invalid-review-request-input');
  }

  const auditLog = createSupabaseAuditLogRepository(locals.supabase);
  const reviewRequests = createSupabaseReviewRequestRepository(locals.supabase, auditLog);
  const result = await reviewRequests.createReviewRequest({
    businessId: membership.businessId,
    jobId,
    deduplicationKey: `${jobId}:completion-review`,
  });

  if (!result.ok) {
    return redirect(`/jobs/${jobId}?error=${encodeURIComponent(result.error)}`);
  }

  return redirect(`/jobs/${jobId}`);
};
