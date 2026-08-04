import type { APIRoute } from 'astro';
import { createSupabasePaymentRepository } from '@ai-company-os/db';
import { createCurrencyCode, createMoney } from '@ai-company-os/core-models';
import { getCurrentMembership } from '../../../../lib/auth/membership';
import { parseDollarsToMinorUnits } from '../../../../lib/estimates/parse-amount';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, params, redirect }) => {
  const { id } = params;
  const user = locals.user!;
  const membership = await getCurrentMembership(locals.supabase, user.id);

  if (!membership || !id) {
    return redirect('/invoices');
  }

  const form = await request.formData();
  const amountInput = form.get('amount');
  const minorUnits = typeof amountInput === 'string' ? parseDollarsToMinorUnits(amountInput) : null;

  if (minorUnits === null) {
    return redirect(`/invoices/${id}?error=invalid-payment-amount`);
  }

  const payments = createSupabasePaymentRepository(locals.supabase);
  const result = await payments.createPayment({
    businessId: membership.businessId,
    invoiceId: id,
    amount: createMoney(minorUnits, createCurrencyCode('USD')),
    occurredAt: new Date().toISOString(),
  });

  if (!result.ok) {
    return redirect(`/invoices/${id}?error=${encodeURIComponent(result.error)}`);
  }

  return redirect(`/invoices/${id}`);
};
