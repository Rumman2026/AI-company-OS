import type { APIRoute } from 'astro';
import { createSupabaseNoteRepository } from '@ai-company-os/db';
import { getCurrentMembership } from '../../lib/auth/membership';
import type { NotableEntityType } from '@ai-company-os/core-models';

export const prerender = false;

const VALID_ENTITY_TYPES: NotableEntityType[] = ['lead', 'contact', 'company', 'job'];

export const POST: APIRoute = async ({ request, locals, redirect }) => {
  const user = locals.user!;
  const membership = await getCurrentMembership(locals.supabase, user.id);

  const form = await request.formData();
  const entityType = form.get('entityType');
  const entityId = form.get('entityId');
  const body = form.get('body');
  const redirectTo = form.get('redirectTo');

  const fallback = typeof redirectTo === 'string' && redirectTo.startsWith('/') ? redirectTo : '/';

  if (!membership) {
    return redirect(fallback);
  }

  if (
    typeof entityType !== 'string' ||
    !VALID_ENTITY_TYPES.includes(entityType as NotableEntityType) ||
    typeof entityId !== 'string' ||
    entityId.trim().length === 0 ||
    typeof body !== 'string' ||
    body.trim().length === 0
  ) {
    return redirect(`${fallback}?error=invalid-note`);
  }

  const notes = createSupabaseNoteRepository(locals.supabase);
  const result = await notes.createNote({
    businessId: membership.businessId,
    entityType: entityType as NotableEntityType,
    entityId,
    body: body.trim(),
    authorId: user.id,
  });

  if (!result.ok) {
    return redirect(`${fallback}?error=${encodeURIComponent(result.error)}`);
  }

  return redirect(fallback);
};
