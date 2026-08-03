import type { APIRoute } from 'astro';

export const prerender = false;

/**
 * Landing point for Supabase Auth's password-recovery email link
 * (`redirectTo` in forgot-password.ts). Exchanges the one-time `code`
 * for a real session (sets cookies via locals.supabase, wired in
 * middleware.ts) before handing off to the actual reset-password page.
 */
export const GET: APIRoute = async ({ url, locals, redirect }) => {
  const code = url.searchParams.get('code');
  if (!code) {
    return redirect('/login?error=invalid-credentials');
  }

  const { error } = await locals.supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return redirect('/login?error=invalid-credentials');
  }

  return redirect('/reset-password');
};
