import type { APIRoute } from 'astro';
import {
  createSupabaseInvoiceRepository,
  createSupabaseAuditLogRepository,
} from '@ai-company-os/db';
import { createCurrencyCode, createMoney } from '@ai-company-os/core-models';
import { getCurrentMembership } from '../../lib/auth/membership';
import { parseDollarsToMinorUnits } from '../../lib/estimates/parse-amount';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const user = locals.user!;
  const membership = await getCurrentMembership(locals.supabase, user.id);

  if (!membership) {
    return redirect('/jobs');
  }

  const form = await request.formData();
  const jobId = form.get('jobId');
  const leadId = form.get('leadId');
  const amountInput = form.get('totalAmount');

  const minorUnits = typeof amountInput === 'string' ? parseDollarsToMinorUnits(amountInput) : null;

  if (
    typeof jobId !== 'string' ||
    jobId.length === 0 ||
    typeof leadId !== 'string' ||
    leadId.length === 0 ||
    minorUnits === null
  ) {
    return redirect(`/jobs/${typeof jobId === 'string' ? jobId : ''}?error=invalid-invoice-input`);
  }

  const auditLog = createSupabaseAuditLogRepository(locals.supabase);
  const invoices = createSupabaseInvoiceRepository(locals.supabase, auditLog);
  const result = await invoices.createInvoice({
    businessId: membership.businessId,
    jobId,
    leadId,
    totalAmount: createMoney(minorUnits, createCurrencyCode('USD')),
  });

  if (!result.ok) {
    return redirect(`/jobs/${jobId}?error=${encodeURIComponent(result.error)}`);
  }

  return redirect(`/jobs/${jobId}`);
};
