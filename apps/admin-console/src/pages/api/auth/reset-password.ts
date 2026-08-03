import type { APIRoute } from 'astro';
import { getAuthenticatedUser } from '../../../lib/auth/session';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const user = await getAuthenticatedUser(locals.supabase);
  if (!user) {
    return redirect('/login?error=invalid-credentials');
  }

  const form = await request.formData();
  const password = form.get('password');
  if (typeof password !== 'string' || password.length < 8) {
    return redirect('/reset-password?error=password-too-short');
  }

  const { error } = await locals.supabase.auth.updateUser({ password });
  if (error) {
    return redirect('/reset-password?error=update-failed');
  }

  return redirect('/');
};
