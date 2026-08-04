import type { APIRoute } from 'astro';
import { createSupabaseTaskRepository } from '@ai-company-os/db';
import { getCurrentMembership } from '../../../../lib/auth/membership';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, params, redirect }) => {
  const user = locals.user!;
  const membership = await getCurrentMembership(locals.supabase, user.id);
  const { id } = params;

  const form = await request.formData();
  const redirectTo = form.get('redirectTo');
  const fallback =
    typeof redirectTo === 'string' && redirectTo.startsWith('/') ? redirectTo : '/tasks';

  if (!membership || !id) {
    return redirect(fallback);
  }

  const tasks = createSupabaseTaskRepository(locals.supabase);
  const result = await tasks.completeTask(membership.businessId, id);

  if (!result.ok) {
    return redirect(`${fallback}?error=${encodeURIComponent(result.error)}`);
  }

  return redirect(fallback);
};
