import type { APIRoute } from 'astro';
import { createSupabaseEstimateRepository } from '@ai-company-os/db';
import { createCurrencyCode, createMoney } from '@ai-company-os/core-models';
import { getCurrentMembership } from '../../../../lib/auth/membership';
import { parseDollarsToMinorUnits } from '../../../../lib/estimates/parse-amount';

export const prerender = false;

function parseTaxRatePercent(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;
  const percentTimes100 = Math.round(Number(trimmed) * 100);
  return Number.isInteger(percentTimes100) && percentTimes100 >= 0 ? percentTimes100 : null;
}

export const POST: APIRoute = async ({ request, locals, params, redirect }) => {
  const { id: estimateId } = params;
  const user = locals.user!;
  const membership = await getCurrentMembership(locals.supabase, user.id);

  if (!membership || !estimateId) {
    return redirect('/leads');
  }

  const form = await request.formData();
  const taxRateInput = form.get('taxRatePercent');
  const discountInput = form.get('discountAmount');
  const depositInput = form.get('depositAmount');

  const taxRateBasisPoints =
    typeof taxRateInput === 'string' && taxRateInput.trim().length > 0
      ? parseTaxRatePercent(taxRateInput)
      : undefined;
  if (
    typeof taxRateInput === 'string' &&
    taxRateInput.trim().length > 0 &&
    taxRateBasisPoints === null
  ) {
    return redirect(`/estimates/${estimateId}?error=invalid-tax-rate`);
  }

  const discountMinorUnits =
    typeof discountInput === 'string' && discountInput.trim().length > 0
      ? parseDollarsToMinorUnits(discountInput)
      : undefined;
  if (
    typeof discountInput === 'string' &&
    discountInput.trim().length > 0 &&
    discountMinorUnits === null
  ) {
    return redirect(`/estimates/${estimateId}?error=invalid-discount`);
  }

  const depositMinorUnits =
    typeof depositInput === 'string' && depositInput.trim().length > 0
      ? parseDollarsToMinorUnits(depositInput)
      : undefined;
  if (
    typeof depositInput === 'string' &&
    depositInput.trim().length > 0 &&
    depositMinorUnits === null
  ) {
    return redirect(`/estimates/${estimateId}?error=invalid-deposit`);
  }

  const estimates = createSupabaseEstimateRepository(locals.supabase);
  const result = await estimates.setEstimatePricing(membership.businessId, estimateId, {
    taxRateBasisPoints: taxRateBasisPoints ?? undefined,
    discountAmount:
      discountMinorUnits !== undefined && discountMinorUnits !== null
        ? createMoney(discountMinorUnits, createCurrencyCode('USD'))
        : undefined,
    depositAmount:
      depositMinorUnits !== undefined && depositMinorUnits !== null
        ? createMoney(depositMinorUnits, createCurrencyCode('USD'))
        : undefined,
  });

  if (!result.ok) {
    return redirect(`/estimates/${estimateId}?error=${encodeURIComponent(result.error)}`);
  }

  return redirect(`/estimates/${estimateId}`);
};
