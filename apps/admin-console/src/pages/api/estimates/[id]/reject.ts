import type { APIRoute } from 'astro';
import { createSupabaseEstimateRepository } from '@ai-company-os/db';
import { getCurrentMembership } from '../../../../lib/auth/membership';

export const prerender = false;

export const POST: APIRoute = async ({ locals, params, redirect }) => {
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

  const result = await estimates.rejectEstimate(membership.businessId, estimateId, user.id);
  if (!result.ok) {
    return redirect(`/leads/${leadId}?error=${encodeURIComponent(result.error)}`);
  }

  return redirect(`/leads/${leadId}`);
};
