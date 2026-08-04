import type { APIRoute } from 'astro';
import { createSupabaseContactRepository } from '@ai-company-os/db';
import { getCurrentMembership } from '../../../../lib/auth/membership';

export const prerender = false;

export const POST: APIRoute = async ({ locals, params, redirect }) => {
  const { id } = params;
  const user = locals.user!;
  const membership = await getCurrentMembership(locals.supabase, user.id);

  if (!membership || !id) {
    return redirect('/contacts');
  }

  const contacts = createSupabaseContactRepository(locals.supabase);
  const result = await contacts.restoreContact(membership.businessId, id);

  if (!result.ok) {
    return redirect(`/contacts/${id}?error=${encodeURIComponent(result.error)}`);
  }

  return redirect(`/contacts/${id}`);
};
