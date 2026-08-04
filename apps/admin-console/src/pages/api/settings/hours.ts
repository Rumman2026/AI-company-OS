import type { APIRoute } from 'astro';
import { createSupabaseBusinessHoursRepository, type DayOfWeek } from '@ai-company-os/db';
import { getCurrentMembership } from '../../../lib/auth/membership';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const user = locals.user!;
  const membership = await getCurrentMembership(locals.supabase, user.id);

  if (!membership) {
    return redirect('/settings');
  }

  const form = await request.formData();

  const days = ([0, 1, 2, 3, 4, 5, 6] as const).map((dayOfWeek) => {
    const opensAtInput = form.get(`opensAt-${dayOfWeek}`);
    const closesAtInput = form.get(`closesAt-${dayOfWeek}`);
    const closed = form.get(`closed-${dayOfWeek}`) === '1';
    return {
      dayOfWeek: dayOfWeek as DayOfWeek,
      opensAt:
        typeof opensAtInput === 'string' && opensAtInput.length > 0 ? opensAtInput : undefined,
      closesAt:
        typeof closesAtInput === 'string' && closesAtInput.length > 0 ? closesAtInput : undefined,
      closed,
    };
  });

  const repo = createSupabaseBusinessHoursRepository(locals.supabase);
  const result = await repo.setBusinessHours(membership.businessId, days);

  if (!result.ok) {
    return redirect(`/settings/hours?error=${encodeURIComponent(result.error)}`);
  }

  return redirect('/settings/hours?saved=1');
};
