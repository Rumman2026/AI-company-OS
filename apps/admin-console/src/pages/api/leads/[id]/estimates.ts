import type { APIRoute } from 'astro';
import { createSupabaseEstimateRepository } from '@ai-company-os/db';
import { createCurrencyCode, createMoney } from '@ai-company-os/core-models';
import { getCurrentMembership } from '../../../../lib/auth/membership';
import { parseDollarsToMinorUnits } from '../../../../lib/estimates/parse-amount';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, params, redirect }) => {
  const { id } = params;
  const user = locals.user!;
  const membership = await getCurrentMembership(locals.supabase, user.id);

  if (!membership || !id) {
    return redirect('/leads');
  }

  const form = await request.formData();
  const amountInput = form.get('proposedAmount');
  const summary = form.get('summary');

  const minorUnits = typeof amountInput === 'string' ? parseDollarsToMinorUnits(amountInput) : null;

  if (minorUnits === null || typeof summary !== 'string' || summary.trim().length === 0) {
    return redirect(`/leads/${id}?error=invalid-estimate-input`);
  }

  const estimates = createSupabaseEstimateRepository(locals.supabase);
  const result = await estimates.createEstimate({
    businessId: membership.businessId,
    leadId: id,
    proposedAmount: createMoney(minorUnits, createCurrencyCode('USD')),
    summary: summary.trim(),
    createdBy: user.id,
  });

  if (!result.ok) {
    return redirect(`/leads/${id}?error=${encodeURIComponent(result.error)}`);
  }

  return redirect(`/leads/${id}`);
};
