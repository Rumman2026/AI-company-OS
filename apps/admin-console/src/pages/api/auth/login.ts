import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const form = await request.formData();
  const email = form.get('email');
  const password = form.get('password');

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    return redirect('/login?error=missing-fields');
  }

  const { error } = await locals.supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return redirect('/login?error=invalid-credentials');
  }

  return redirect('/');
};
