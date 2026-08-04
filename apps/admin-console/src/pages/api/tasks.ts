import type { APIRoute } from 'astro';
import { createSupabaseTaskRepository } from '@ai-company-os/db';
import { getCurrentMembership } from '../../lib/auth/membership';
import type { NotableEntityType } from '@ai-company-os/core-models';

export const prerender = false;

const VALID_ENTITY_TYPES: NotableEntityType[] = ['lead', 'contact', 'company', 'job'];

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const user = locals.user!;
  const membership = await getCurrentMembership(locals.supabase, user.id);

  const form = await request.formData();
  const title = form.get('title');
  const dueAt = form.get('dueAt');
  const entityType = form.get('entityType');
  const entityId = form.get('entityId');
  const redirectTo = form.get('redirectTo');

  const fallback =
    typeof redirectTo === 'string' && redirectTo.startsWith('/') ? redirectTo : '/tasks';

  if (!membership) {
    return redirect(fallback);
  }

  if (typeof title !== 'string' || title.trim().length === 0) {
    return redirect(`${fallback}?error=missing-title`);
  }

  const hasEntityType = typeof entityType === 'string' && entityType.length > 0;
  const hasEntityId = typeof entityId === 'string' && entityId.length > 0;
  if (hasEntityType !== hasEntityId) {
    return redirect(`${fallback}?error=invalid-entity-attachment`);
  }
  if (hasEntityType && !VALID_ENTITY_TYPES.includes(entityType as NotableEntityType)) {
    return redirect(`${fallback}?error=invalid-entity-type`);
  }

  const tasks = createSupabaseTaskRepository(locals.supabase);
  const result = await tasks.createTask({
    businessId: membership.businessId,
    title: title.trim(),
    dueAt:
      typeof dueAt === 'string' && dueAt.length > 0 ? new Date(dueAt).toISOString() : undefined,
    entityType: hasEntityType ? (entityType as NotableEntityType) : undefined,
    entityId: hasEntityId ? (entityId as string) : undefined,
    createdBy: user.id,
  });

  if (!result.ok) {
    return redirect(`${fallback}?error=${encodeURIComponent(result.error)}`);
  }

  return redirect(fallback);
};
