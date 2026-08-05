import type { APIRoute } from 'astro';
import { createSupabaseReviewRecordRepository } from '@ai-company-os/db';
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
  const sourcePlatform = form.get('sourcePlatform');

  if (
    typeof jobId !== 'string' ||
    jobId.length === 0 ||
    typeof sourcePlatform !== 'string' ||
    sourcePlatform.trim().length === 0
  ) {
    return redirect(
      `/jobs/${typeof jobId === 'string' ? jobId : ''}?error=invalid-review-record-input`,
    );
  }

  const reviewRecords = createSupabaseReviewRecordRepository(locals.supabase);
  const result = await reviewRecords.createReviewRecord({
    businessId: membership.businessId,
    jobId,
    sourcePlatform: sourcePlatform.trim(),
    receivedAt: new Date().toISOString(),
  });

  if (!result.ok) {
    return redirect(`/jobs/${jobId}?error=${encodeURIComponent(result.error)}`);
  }

  return redirect(`/jobs/${jobId}`);
};
