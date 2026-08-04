import type { APIRoute } from 'astro';
import { createSupabaseNotificationRepository } from '@ai-company-os/db';

export const prerender = false;

export const POST: APIRoute = async ({ locals, params, redirect }) => {
  const { id: notificationId } = params;
  const user = locals.user!;

  if (!notificationId) {
    return redirect('/notifications');
  }

  const repo = createSupabaseNotificationRepository(locals.supabase);
  await repo.markNotificationRead(user.id, notificationId);

  return redirect('/notifications');
};
