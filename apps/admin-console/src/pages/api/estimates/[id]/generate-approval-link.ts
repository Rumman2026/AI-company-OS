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
  const result = await estimates.generateCustomerApprovalLink(membership.businessId, estimateId);

  if (!result.ok) {
    return redirect(`/estimates/${estimateId}?error=${encodeURIComponent(result.error)}`);
  }

  return redirect(`/estimates/${estimateId}`);
};
