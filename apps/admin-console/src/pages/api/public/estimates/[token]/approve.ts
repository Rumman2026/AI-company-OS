import type { APIRoute } from 'astro';
import { createPublicEstimateRepository } from '../../../../../lib/estimates/public-approval-client';

export const prerender = false;

/**
 * Public, unauthenticated - authorized solely by possession of the
 * estimate's own unguessable token (never by a session). See
 * DECISIONS.md ADR-0030 and lib/estimates/public-approval-client.ts.
 */
export const POST: APIRoute = async ({ request, params, redirect }) => {
  const { token } = params;
  if (!token) {
    return redirect('/approve/invalid');
  }

  const form = await request.formData();
  const signatureName = form.get('signatureName');

  if (typeof signatureName !== 'string' || signatureName.trim().length === 0) {
    return redirect(`/approve/${token}?error=invalid-signature-name`);
  }

  const estimates = createPublicEstimateRepository();
  if (!estimates) {
    return redirect(`/approve/${token}?error=not-available`);
  }

  const result = await estimates.approveEstimateByCustomerToken(token, signatureName);

  if (!result.ok) {
    return redirect(`/approve/${token}?error=${encodeURIComponent(result.error)}`);
  }

  return redirect(`/approve/${token}?approved=1`);
};
