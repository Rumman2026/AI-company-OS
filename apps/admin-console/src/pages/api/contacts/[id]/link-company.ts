import type { APIRoute } from 'astro';
import { createSupabaseContactRepository } from '@ai-company-os/db';
import { getCurrentMembership } from '../../../../lib/auth/membership';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, params, redirect }) => {
  const { id } = params;
  const user = locals.user!;
  const membership = await getCurrentMembership(locals.supabase, user.id);

  if (!membership || !id) {
    return redirect('/contacts');
  }

  const form = await request.formData();
  const companyId = form.get('companyId');

  if (typeof companyId !== 'string' || companyId.length === 0) {
    return redirect(`/contacts/${id}?error=missing-company`);
  }

  const contacts = createSupabaseContactRepository(locals.supabase);
  const result = await contacts.linkCompany(membership.businessId, id, companyId);

  if (!result.ok) {
    return redirect(`/contacts/${id}?error=${encodeURIComponent(result.error)}`);
  }

  return redirect(`/contacts/${id}`);
};
