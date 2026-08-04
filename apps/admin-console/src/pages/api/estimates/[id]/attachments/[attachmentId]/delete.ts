import type { APIRoute } from 'astro';
import { createSupabaseEstimateAttachmentRepository } from '@ai-company-os/db';
import { getCurrentMembership } from '../../../../../../lib/auth/membership';

export const prerender = false;

export const POST: APIRoute = async ({ locals, params, redirect }) => {
  const { id: estimateId, attachmentId } = params;
  const user = locals.user!;
  const membership = await getCurrentMembership(locals.supabase, user.id);

  if (!membership || !estimateId || !attachmentId) {
    return redirect('/leads');
  }

  const attachments = createSupabaseEstimateAttachmentRepository(locals.supabase);
  const result = await attachments.deleteAttachment(membership.businessId, attachmentId);

  if (!result.ok) {
    return redirect(`/estimates/${estimateId}?error=${encodeURIComponent(result.error)}`);
  }

  return redirect(`/estimates/${estimateId}`);
};
