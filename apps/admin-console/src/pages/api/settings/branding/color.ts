import type { APIRoute } from 'astro';
import { createSupabaseBusinessProfileRepository } from '@ai-company-os/db';
import { getCurrentMembership } from '../../../../lib/auth/membership';

export const prerender = false;

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const user = locals.user!;
  const membership = await getCurrentMembership(locals.supabase, user.id);

  if (!membership) {
    return redirect('/settings');
  }

  const form = await request.formData();
  const primaryColorInput = form.get('primaryColor');
  const trimmed = typeof primaryColorInput === 'string' ? primaryColorInput.trim() : '';

  if (trimmed.length > 0 && !HEX_COLOR_PATTERN.test(trimmed)) {
    return redirect('/settings/branding?error=invalid-color-must-be-a-hex-code-like-%231a7f37');
  }

  const repo = createSupabaseBusinessProfileRepository(locals.supabase);
  const result = await repo.updateBusinessProfile(membership.businessId, {
    primaryColor: trimmed,
  });

  if (!result.ok) {
    return redirect(`/settings/branding?error=${encodeURIComponent(result.error)}`);
  }

  return redirect('/settings/branding?saved=1');
};
