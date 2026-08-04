import type { APIRoute } from 'astro';
import { getAuthenticatedUser } from '../../../../lib/auth/session';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const user = await getAuthenticatedUser(locals.supabase);
  if (!user || !user.email) {
    return redirect('/login');
  }

  const form = await request.formData();
  const currentPassword = form.get('currentPassword');
  const newPassword = form.get('newPassword');
  const confirmPassword = form.get('confirmPassword');

  if (typeof currentPassword !== 'string' || currentPassword.length === 0) {
    return redirect('/settings/security?error=current-password-incorrect');
  }
  if (typeof newPassword !== 'string' || newPassword.length < 8) {
    return redirect('/settings/security?error=password-too-short');
  }
  if (newPassword !== confirmPassword) {
    return redirect('/settings/security?error=passwords-do-not-match');
  }

  // Re-verify the current password before allowing a change - Supabase
  // Auth's updateUser() does not itself require the caller to prove
  // knowledge of the current password for an already-authenticated
  // session, so this signInWithPassword() call is what actually
  // enforces that requirement.
  const { error: verifyError } = await locals.supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });
  if (verifyError) {
    return redirect('/settings/security?error=current-password-incorrect');
  }

  const { error: updateError } = await locals.supabase.auth.updateUser({ password: newPassword });
  if (updateError) {
    return redirect('/settings/security?error=update-failed');
  }

  return redirect('/settings/security?saved=1');
};
