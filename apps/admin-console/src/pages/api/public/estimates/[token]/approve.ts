import type { APIRoute } from 'astro';
import { createPublicApprovalNotificationClients } from '../../../../../lib/estimates/public-approval-client';

export const prerender = false;

/**
 * Public, unauthenticated - authorized solely by possession of the
 * estimate's own unguessable token (never by a session). See
 * DECISIONS.md ADR-0030 and lib/estimates/public-approval-client.ts.
 *
 * On success, notifies every team member for this estimate's business
 * (DECISIONS.md ADR-0034) - real, in-app only (channel: 'in-app'); a
 * notification failure never blocks or undoes the approval itself,
 * since the approval is the record of what actually happened.
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

  const clients = createPublicApprovalNotificationClients();
  if (!clients) {
    return redirect(`/approve/${token}?error=not-available`);
  }

  const result = await clients.estimates.approveEstimateByCustomerToken(token, signatureName);

  if (!result.ok) {
    return redirect(`/approve/${token}?error=${encodeURIComponent(result.error)}`);
  }

  const rosterResult = await clients.teamRoster.listTeamRoster(result.businessId);
  if (rosterResult.ok) {
    await Promise.all(
      rosterResult.members.map((member) =>
        clients.notifications.createNotification({
          businessId: result.businessId,
          recipientUserId: member.userId,
          channel: 'in-app',
          eventType: 'estimate-customer-approved',
          title: 'Estimate approved by customer',
          body: `${result.estimate.customerSignatureName ?? 'A customer'} approved an estimate.`,
          entityType: 'lead',
          entityId: result.estimate.leadId,
        }),
      ),
    );
  }

  return redirect(`/approve/${token}?approved=1`);
};
