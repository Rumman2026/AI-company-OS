import type { APIRoute } from 'astro';
import { createSupabaseCompanyRepository } from '@ai-company-os/db';
import { getCurrentMembership } from '../../../../lib/auth/membership';

export const prerender = false;

export const POST: APIRoute = async ({ locals, params, redirect }) => {
  const { id } = params;
  const user = locals.user!;
  const membership = await getCurrentMembership(locals.supabase, user.id);

  if (!membership || !id) {
    return redirect('/companies');
  }

  const companies = createSupabaseCompanyRepository(locals.supabase);
  const result = await companies.restoreCompany(membership.businessId, id);

  if (!result.ok) {
    return redirect(`/companies/${id}?error=${encodeURIComponent(result.error)}`);
  }

  return redirect(`/companies/${id}`);
};
