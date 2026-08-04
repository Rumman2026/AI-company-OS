import type { APIRoute } from 'astro';
import { createSupabasePhotoAssetRepository } from '@ai-company-os/db';
import { getCurrentMembership } from '../../../../lib/auth/membership';

export const prerender = false;

const VALID_KINDS = ['before', 'progress', 'after'];

export const POST: APIRoute = async ({ request, locals, params, redirect }) => {
  const { id: jobId } = params;
  const user = locals.user!;
  const membership = await getCurrentMembership(locals.supabase, user.id);

  if (!membership || !jobId) {
    return redirect('/jobs');
  }

  const form = await request.formData();
  const kind = form.get('kind');
  const file = form.get('file');

  if (typeof kind !== 'string' || !VALID_KINDS.includes(kind)) {
    return redirect(`/jobs/${jobId}?error=invalid-photo-kind`);
  }
  if (!(file instanceof File) || file.size === 0) {
    return redirect(`/jobs/${jobId}?error=missing-photo-file`);
  }

  const photos = createSupabasePhotoAssetRepository(locals.supabase);
  const result = await photos.uploadPhoto({
    businessId: membership.businessId,
    jobId,
    kind: kind as 'before' | 'progress' | 'after',
    file,
    filename: file.name,
    contentType: file.type || undefined,
    uploadedBy: user.id,
  });

  if (!result.ok) {
    return redirect(`/jobs/${jobId}?error=${encodeURIComponent(result.error)}`);
  }

  return redirect(`/jobs/${jobId}`);
};
