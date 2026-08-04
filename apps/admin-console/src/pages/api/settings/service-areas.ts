import type { APIRoute } from 'astro';
import { createSupabaseBusinessServiceAreaRepository } from '@ai-company-os/db';
import { getCurrentMembership } from '../../../lib/auth/membership';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const user = locals.user!;
  const membership = await getCurrentMembership(locals.supabase, user.id);

  if (!membership) {
    return redirect('/settings');
  }

  const form = await request.formData();
  const areaNameInput = form.get('areaName');
  const areaName = typeof areaNameInput === 'string' ? areaNameInput.trim() : '';

  if (areaName.length === 0) {
    return redirect('/settings/service-areas?error=area-name-is-required');
  }

  const repo = createSupabaseBusinessServiceAreaRepository(locals.supabase);
  const result = await repo.createServiceArea(membership.businessId, areaName);

  if (!result.ok) {
    return redirect(`/settings/service-areas?error=${encodeURIComponent(result.error)}`);
  }

  return redirect('/settings/service-areas');
};
