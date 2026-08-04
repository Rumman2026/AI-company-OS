import type { APIRoute } from 'astro';
import {
  createSupabaseEstimateRepository,
  createSupabaseEstimateLineItemRepository,
} from '@ai-company-os/db';
import { getCurrentMembership } from '../../../../../../lib/auth/membership';

export const prerender = false;

export const POST: APIRoute = async ({ locals, params, redirect }) => {
  const { id: estimateId, lineItemId } = params;
  const user = locals.user!;
  const membership = await getCurrentMembership(locals.supabase, user.id);

  if (!membership || !estimateId || !lineItemId) {
    return redirect('/leads');
  }

  const estimateRepository = createSupabaseEstimateRepository(locals.supabase);
  const lineItems = createSupabaseEstimateLineItemRepository(locals.supabase, estimateRepository);
  const result = await lineItems.deleteLineItem(membership.businessId, estimateId, lineItemId);

  if (!result.ok) {
    return redirect(`/estimates/${estimateId}?error=${encodeURIComponent(result.error)}`);
  }

  return redirect(`/estimates/${estimateId}`);
};
