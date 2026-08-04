import type { APIRoute } from 'astro';
import { createSupabaseBusinessProfileRepository } from '@ai-company-os/db';
import { getCurrentMembership } from '../../../../lib/auth/membership';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const user = locals.user!;
  const membership = await getCurrentMembership(locals.supabase, user.id);

  if (!membership) {
    return redirect('/settings');
  }

  const form = await request.formData();
  const file = form.get('file');

  if (!(file instanceof File) || file.size === 0) {
    return redirect('/settings/branding?error=invalid-logo-file');
  }

  const repo = createSupabaseBusinessProfileRepository(locals.supabase);
  const result = await repo.uploadBusinessLogo({
    businessId: membership.businessId,
    file,
    fileName: file.name,
    contentType: file.type || undefined,
  });

  if (!result.ok) {
    return redirect(`/settings/branding?error=${encodeURIComponent(result.error)}`);
  }

  return redirect('/settings/branding?saved=1');
};
