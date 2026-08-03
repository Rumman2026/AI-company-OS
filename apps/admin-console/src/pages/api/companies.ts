import type { APIRoute } from 'astro';
import { createSupabaseCompanyRepository } from '@ai-company-os/db';
import { getCurrentMembership } from '../../lib/auth/membership';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const user = locals.user!;
  const membership = await getCurrentMembership(locals.supabase, user.id);

  if (!membership) {
    return redirect('/companies');
  }

  const form = await request.formData();
  const name = form.get('name');

  if (typeof name !== 'string' || name.trim().length === 0) {
    return redirect('/companies?error=missing-name');
  }

  const companies = createSupabaseCompanyRepository(locals.supabase);
  const result = await companies.createCompany({
    businessId: membership.businessId,
    name: name.trim(),
  });

  if (!result.ok) {
    return redirect(`/companies?error=${encodeURIComponent(result.error)}`);
  }

  return redirect(`/companies/${result.company.id}`);
};
