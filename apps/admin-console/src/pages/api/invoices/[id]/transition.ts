import type { APIRoute } from 'astro';
import {
  createSupabaseInvoiceRepository,
  createSupabaseAuditLogRepository,
} from '@ai-company-os/db';
import {
  createCurrencyCode,
  createMoney,
  type PaymentOutcomeEvidence,
} from '@ai-company-os/core-models';
import { getCurrentMembership } from '../../../../lib/auth/membership';
import { isValidInvoiceStatus } from '../../../../lib/invoices/validate-status';
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
  const requestedStatus = form.get('requestedStatus');
  const reason = form.get('reason');
  const amountReceivedInput = form.get('amountReceived');

  if (!isValidInvoiceStatus(requestedStatus)) {
    return redirect(`/invoices/${id}?error=invalid-status`);
  }

  let evidence: PaymentOutcomeEvidence | undefined;
  if (requestedStatus === 'paid' || requestedStatus === 'partially-paid') {
    const minorUnits =
      typeof amountReceivedInput === 'string'
        ? parseDollarsToMinorUnits(amountReceivedInput)
        : null;
    if (minorUnits !== null) {
      evidence = {
        outcome: requestedStatus === 'paid' ? 'full-payment' : 'partial-payment',
        amountReceived: createMoney(minorUnits, createCurrencyCode('USD')),
      };
    }
  } else if (requestedStatus === 'voided') {
    // Harmless when the matched rule's requiredEvidence is 'none' -
    // evidenceMatches() short-circuits on 'none' without inspecting this.
    evidence = { outcome: 'no-captured-payment' };
  }

  const auditLog = createSupabaseAuditLogRepository(locals.supabase);
  const invoices = createSupabaseInvoiceRepository(locals.supabase, auditLog);

  const result = await invoices.transitionInvoiceStatusForRoles(
    membership.businessId,
    id,
    requestedStatus,
    membership.roles,
    {
      actorId: user.id,
      occurredAt: new Date().toISOString(),
      reason: typeof reason === 'string' && reason.length > 0 ? reason : undefined,
    },
    evidence,
  );

  if (!result.ok) {
    return redirect(`/invoices/${id}?error=${encodeURIComponent(result.error)}`);
  }
  if (result.result.outcome === 'rejected') {
    return redirect(`/invoices/${id}?error=${encodeURIComponent(result.result.reason)}`);
  }

  return redirect(`/invoices/${id}`);
};
