import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, redirect, url }) => {
  const form = await request.formData();
  const email = form.get('email');

  // Always redirect to the same "check your inbox" message regardless of
  // outcome - never reveal whether a given email has an account.
  if (typeof email === 'string' && email) {
    const redirectTo = new URL('/api/auth/callback', url.origin).toString();
    await locals.supabase.auth.resetPasswordForEmail(email, { redirectTo });
  }

  return redirect('/forgot-password?sent=1');
};
