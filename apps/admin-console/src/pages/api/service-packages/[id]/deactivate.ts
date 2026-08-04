import type { APIRoute } from 'astro';
import { createSupabaseServicePackageRepository } from '@ai-company-os/db';
import { getCurrentMembership } from '../../../../lib/auth/membership';

export const prerender = false;

export const POST: APIRoute = async ({ locals, params, redirect }) => {
  const { id } = params;
  const user = locals.user!;
  const membership = await getCurrentMembership(locals.supabase, user.id);

  if (!membership || !id) {
    return redirect('/service-packages');
  }

  const servicePackages = createSupabaseServicePackageRepository(locals.supabase);
  const result = await servicePackages.setServicePackageActive(membership.businessId, id, false);

  if (!result.ok) {
    return redirect(`/service-packages?error=${encodeURIComponent(result.error)}`);
  }

  return redirect('/service-packages');
};
