import { randomUUID } from 'node:crypto';
import { computeIdempotencyKey } from './idempotency';
import type { LeadStore } from './lead-store';
import type { NotificationSender } from './notification-sender';
import type { QuoteSubmissionAdapter, QuoteSubmissionContext } from './adapter';
import type { NormalizedQuoteInput, QuoteSubmissionResult } from './types';

/**
 * The approved delivery/success policy, implemented as pure orchestration
 * over injected LeadStore/NotificationSender dependencies - no real
 * Supabase or Resend SDK reference here, so this is fully unit-testable
 * with fakes (see tests/quote-delivery-unit.spec.ts).
 *
 * Policy (see src/lib/quote-form/README.md for the full writeup):
 * 1. Store the lead in Supabase. Storage failure -> delivery_failed;
 *    Resend is never called.
 * 2. An idempotent replay (same content already stored) -> success with
 *    the existing lead id; no second owner notification and no second
 *    customer confirmation is sent.
 * 3. A fresh, successful store -> attempt the Resend owner notification.
 * 4. Notification succeeds -> success.
 * 5. Notification fails -> the lead remains stored (never deleted), its
 *    notification_status is recorded as failed, and the result is the
 *    honest non-success state closest to what happened - never a
 *    fabricated success.
 * 6. For a fresh store (regardless of owner-notification outcome), also
 *    attempt a customer-facing confirmation email. Its outcome is
 *    recorded (LeadStore.markCustomerConfirmationStatus) but never
 *    changes the returned QuoteSubmissionResult - the lead is already
 *    safely stored and the owner path already governs delivery_failed
 *    vs success; the customer confirmation is a best-effort courtesy on
 *    top of that, not a second delivery-critical channel.
 */
export function createSupabaseResendAdapter(
  store: LeadStore,
  notifier: NotificationSender,
): QuoteSubmissionAdapter {
  return {
    name: 'supabase-resend',
    async submit(
      input: NormalizedQuoteInput,
      context: QuoteSubmissionContext,
    ): Promise<QuoteSubmissionResult> {
      const leadId = randomUUID();
      const createdAt = new Date().toISOString();
      const idempotencyKey = computeIdempotencyKey(input);

      const insertResult = await store.insertLead({
        leadId,
        createdAt,
        pagePath: context.pagePath,
        idempotencyKey,
        input,
      });

      if (!insertResult.ok) {
        return {
          status: 'delivery_failed',
          message: "We couldn't send your request. Please call or email us directly.",
        };
      }

      const { row, duplicate } = insertResult;

      if (context.isTestLead) {
        await store.markTestLead(row.leadId);
      }

      if (duplicate) {
        // Already recorded on a prior attempt - do not send a second
        // owner notification or a second customer confirmation for the
        // same content.
        return { status: 'success', leadId: row.leadId, submittedAt: row.createdAt };
      }

      const notificationPayload = {
        leadId: row.leadId,
        createdAt: row.createdAt,
        pagePath: context.pagePath,
        input,
      };

      const notifyResult = await notifier.sendLeadNotification(notificationPayload);

      if (notifyResult.ok) {
        await store.markNotificationStatus(row.leadId, 'sent', {
          providerId: notifyResult.providerId,
        });
      } else {
        await store.markNotificationStatus(row.leadId, 'failed', {
          errorCode: notifyResult.error,
        });
      }

      // Best-effort, non-blocking: attempted for a fresh store regardless
      // of the owner-notification outcome above. Never changes the
      // returned QuoteSubmissionResult.
      const confirmationResult = await notifier.sendCustomerConfirmation(notificationPayload);
      if (confirmationResult.ok) {
        await store.markCustomerConfirmationStatus(row.leadId, 'sent', {
          providerId: confirmationResult.providerId,
        });
      } else {
        await store.markCustomerConfirmationStatus(row.leadId, 'failed', {
          errorCode: confirmationResult.error,
        });
      }

      if (notifyResult.ok) {
        return { status: 'success', leadId: row.leadId, submittedAt: row.createdAt };
      }

      // Partial failure: the lead IS safely stored - never lost, never
      // deleted - but the operational notification could not be
      // confirmed. The approved policy forbids reporting `success` here.
      // `delivery_failed` is the closest fit in the current four-state
      // contract; the message is deliberately distinct from the
      // total-failure message above so it doesn't understate what
      // happened, and steers the customer to a redundant channel instead
      // of inviting a resubmission that would just collide with the same
      // idempotency key.
      return {
        status: 'delivery_failed',
        message:
          "We received your request, but couldn't confirm it went through. Please also call or email us directly so we don't miss it.",
      };
    },
  };
}
