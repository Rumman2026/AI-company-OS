import type { APIRoute } from 'astro';
import { createSupabaseBusinessProfileRepository } from '@ai-company-os/db';
import { getCurrentMembership } from '../../../lib/auth/membership';

export const prerender = false;

function textOrUndefined(value: FormDataEntryValue | null): string | undefined {
  return typeof value === 'string' ? value.trim() : undefined;
}

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const user = locals.user!;
  const membership = await getCurrentMembership(locals.supabase, user.id);

  if (!membership) {
    return redirect('/settings');
  }

  const form = await request.formData();
  const name = textOrUndefined(form.get('name'));

  if (!name || name.length === 0) {
    return redirect('/settings/profile?error=business-name-is-required');
  }

  const repo = createSupabaseBusinessProfileRepository(locals.supabase);
  const result = await repo.updateBusinessProfile(membership.businessId, {
    name,
    address: textOrUndefined(form.get('address')),
    city: textOrUndefined(form.get('city')),
    state: textOrUndefined(form.get('state')),
    postalCode: textOrUndefined(form.get('postalCode')),
    phone: textOrUndefined(form.get('phone')),
    email: textOrUndefined(form.get('email')),
    website: textOrUndefined(form.get('website')),
  });

  if (!result.ok) {
    return redirect(`/settings/profile?error=${encodeURIComponent(result.error)}`);
  }

  return redirect('/settings/profile?saved=1');
};
