import type { APIRoute } from 'astro';
import { createSupabaseEstimateAttachmentRepository } from '@ai-company-os/db';
import { getCurrentMembership } from '../../../../lib/auth/membership';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, params, redirect }) => {
  const { id: estimateId } = params;
  const user = locals.user!;
  const membership = await getCurrentMembership(locals.supabase, user.id);

  if (!membership || !estimateId) {
    return redirect('/leads');
  }

  const form = await request.formData();
  const file = form.get('file');
  const caption = form.get('caption');

  if (!(file instanceof File) || file.size === 0) {
    return redirect(`/estimates/${estimateId}?error=invalid-attachment-input`);
  }

  const attachments = createSupabaseEstimateAttachmentRepository(locals.supabase);
  const result = await attachments.uploadAttachment({
    businessId: membership.businessId,
    estimateId,
    file,
    fileName: file.name,
    contentType: file.type || undefined,
    caption: typeof caption === 'string' && caption.trim().length > 0 ? caption.trim() : undefined,
    uploadedBy: user.id,
  });

  if (!result.ok) {
    return redirect(`/estimates/${estimateId}?error=${encodeURIComponent(result.error)}`);
  }

  return redirect(`/estimates/${estimateId}`);
};
