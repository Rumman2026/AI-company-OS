import type { APIRoute } from 'astro';
import {
  createSupabaseEstimateRepository,
  createSupabaseEstimateLineItemRepository,
} from '@ai-company-os/db';
import { createCurrencyCode, createMoney } from '@ai-company-os/core-models';
import { getCurrentMembership } from '../../../../lib/auth/membership';
import { parseDollarsToMinorUnits } from '../../../../lib/estimates/parse-amount';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, params, redirect }) => {
  const { id: estimateId } = params;
  const user = locals.user!;
  const membership = await getCurrentMembership(locals.supabase, user.id);

  if (!membership || !estimateId) {
    return redirect('/leads');
  }

  const form = await request.formData();
  const description = form.get('description');
  const quantityInput = form.get('quantity');
  const priceInput = form.get('unitPrice');
  const servicePackageId = form.get('servicePackageId');

  const quantity = typeof quantityInput === 'string' ? Number(quantityInput) : NaN;
  const minorUnits = typeof priceInput === 'string' ? parseDollarsToMinorUnits(priceInput) : null;

  if (
    typeof description !== 'string' ||
    description.trim().length === 0 ||
    !Number.isInteger(quantity) ||
    quantity <= 0 ||
    minorUnits === null
  ) {
    return redirect(`/estimates/${estimateId}?error=invalid-line-item-input`);
  }

  const estimateRepository = createSupabaseEstimateRepository(locals.supabase);
  const lineItems = createSupabaseEstimateLineItemRepository(locals.supabase, estimateRepository);
  const result = await lineItems.createLineItem({
    businessId: membership.businessId,
    estimateId,
    description: description.trim(),
    quantity,
    unitPrice: createMoney(minorUnits, createCurrencyCode('USD')),
    servicePackageId:
      typeof servicePackageId === 'string' && servicePackageId.length > 0
        ? servicePackageId
        : undefined,
  });

  if (!result.ok) {
    return redirect(`/estimates/${estimateId}?error=${encodeURIComponent(result.error)}`);
  }

  return redirect(`/estimates/${estimateId}`);
};
