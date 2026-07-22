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
 *    the existing lead id; no second notification is sent.
 * 3. A fresh, successful store -> attempt the Resend notification.
 * 4. Notification succeeds -> success.
 * 5. Notification fails -> the lead remains stored (never deleted), its
 *    notification_status is recorded as failed, and the result is the
 *    honest non-success state closest to what happened - never a
 *    fabricated success.
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

      if (duplicate) {
        // Already recorded on a prior attempt - do not send a second
        // notification for the same content.
        return { status: 'success', leadId: row.leadId, submittedAt: row.createdAt };
      }

      const notifyResult = await notifier.sendLeadNotification({
        leadId: row.leadId,
        createdAt: row.createdAt,
        pagePath: context.pagePath,
        input,
      });

      if (notifyResult.ok) {
        await store.markNotificationStatus(row.leadId, 'sent', {
          providerId: notifyResult.providerId,
        });
        return { status: 'success', leadId: row.leadId, submittedAt: row.createdAt };
      }

      await store.markNotificationStatus(row.leadId, 'failed', {
        errorCode: notifyResult.error,
      });

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
