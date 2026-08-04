import type { APIRoute } from 'astro';
import {
  createSupabaseEstimateRepository,
  createSupabaseBookingRepository,
  createSupabaseJobRepository,
  createSupabaseAuditLogRepository,
} from '@ai-company-os/db';
import { getCurrentMembership } from '../../../../lib/auth/membership';

export const prerender = false;

/**
 * Creates a Booking from an Estimate, then immediately creates its Job
 * (at 'draft' - see DECISIONS.md ADR-0012) and links the two. Also
 * best-effort attempts the draft -> scheduled transition, trying every
 * role the calling user holds (see DECISIONS.md ADR-0018) -
 * core-models' transitionJob() only allows office-manager/dispatcher
 * for that edge, so a membership holding none of those roles will see
 * the Job created but left at 'draft', with an honest note rather than
 * a silent failure or a fabricated success.
 */
export const POST: APIRoute = async ({ request, locals, params, redirect }) => {
  const { id: estimateId } = params;
  const user = locals.user!;
  const membership = await getCurrentMembership(locals.supabase, user.id);

  if (!membership || !estimateId) {
    return redirect('/leads');
  }

  const estimates = createSupabaseEstimateRepository(locals.supabase);
  const estimateResult = await estimates.getEstimate(membership.businessId, estimateId);
  if (!estimateResult.ok) {
    return redirect('/leads');
  }
  const leadId = estimateResult.estimate.leadId;

  if (estimateResult.estimate.status !== 'approved') {
    return redirect(`/leads/${leadId}?error=estimate_not_approved`);
  }

  const form = await request.formData();
  const scheduledAtInput = form.get('scheduledAt');

  if (typeof scheduledAtInput !== 'string' || scheduledAtInput.length === 0) {
    return redirect(`/leads/${leadId}?error=missing-scheduled-at`);
  }

  const scheduledAtDate = new Date(scheduledAtInput);
  if (Number.isNaN(scheduledAtDate.getTime())) {
    return redirect(`/leads/${leadId}?error=invalid-scheduled-at`);
  }

  const bookings = createSupabaseBookingRepository(locals.supabase);
  const bookingResult = await bookings.createBooking({
    businessId: membership.businessId,
    leadId,
    estimateId,
    scheduledAt: scheduledAtDate.toISOString(),
    createdBy: user.id,
  });
  if (!bookingResult.ok) {
    return redirect(`/leads/${leadId}?error=${encodeURIComponent(bookingResult.error)}`);
  }

  const auditLog = createSupabaseAuditLogRepository(locals.supabase);
  const jobs = createSupabaseJobRepository(locals.supabase, auditLog);
  const jobResult = await jobs.createJob(membership.businessId, leadId, bookingResult.booking.id);
  if (!jobResult.ok) {
    // The booking is safely stored either way - a job-creation failure
    // is surfaced, never hidden, but never rolls back the booking.
    return redirect(
      `/leads/${leadId}?error=${encodeURIComponent('booking_created_job_failed_' + jobResult.error)}`,
    );
  }

  await bookings.linkJob(membership.businessId, bookingResult.booking.id, jobResult.job.id);

  const transitionResult = await jobs.transitionJobStatusForRoles(
    membership.businessId,
    jobResult.job.id,
    'scheduled',
    membership.roles,
    { actorId: user.id, occurredAt: new Date().toISOString() },
  );

  if (transitionResult.ok && transitionResult.result.outcome === 'rejected') {
    // Expected for an owner-admin-only membership - the Job was created
    // successfully and is real, just left at 'draft' until an
    // office-manager/dispatcher schedules it. Not an error to hide.
    return redirect(
      `/leads/${leadId}?info=${encodeURIComponent('job_created_at_draft_' + transitionResult.result.errorCode)}`,
    );
  }

  return redirect(`/leads/${leadId}`);
};
