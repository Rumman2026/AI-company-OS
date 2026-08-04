import type { APIRoute } from 'astro';
import { createSupabaseBusinessServiceAreaRepository } from '@ai-company-os/db';
import { getCurrentMembership } from '../../../../../lib/auth/membership';

export const prerender = false;

export const POST: APIRoute = async ({ locals, params, redirect }) => {
  const { areaId } = params;
  const user = locals.user!;
  const membership = await getCurrentMembership(locals.supabase, user.id);

  if (!membership || !areaId) {
    return redirect('/settings');
  }

  const repo = createSupabaseBusinessServiceAreaRepository(locals.supabase);
  const result = await repo.deleteServiceArea(membership.businessId, areaId);

  if (!result.ok) {
    return redirect(`/settings/service-areas?error=${encodeURIComponent(result.error)}`);
  }

  return redirect('/settings/service-areas');
};
