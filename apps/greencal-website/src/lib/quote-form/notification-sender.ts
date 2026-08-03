import { Resend } from 'resend';
import type { NormalizedQuoteInput } from './types';

export interface LeadNotificationPayload {
  leadId: string;
  createdAt: string;
  pagePath: string;
  input: NormalizedQuoteInput;
}

export type NotificationSendResult =
  { ok: true; providerId: string } | { ok: false; error: string };

/**
 * The narrow interface the orchestration layer depends on - not the real
 * Resend SDK. Keeps supabase-resend-adapter.ts's partial-failure decisions
 * fully unit-testable with a simple fake, no real network/SDK involved.
 */
export interface NotificationSender {
  sendLeadNotification(payload: LeadNotificationPayload): Promise<NotificationSendResult>;
  /**
   * Customer-facing confirmation - distinct from the owner notification
   * above. Never quotes pricing, promises availability, or guarantees
   * anything (see buildCustomerConfirmationEmail). Its outcome must never
   * change the QuoteSubmissionResult - see supabase-resend-adapter.ts.
   */
  sendCustomerConfirmation(payload: LeadNotificationPayload): Promise<NotificationSendResult>;
}

/** Prevents HTML injection from customer-supplied free-text fields. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Pure content builder, exported for direct unit testing. Every
 * customer-supplied field is HTML-escaped before interpolation. Contains
 * only factual submission data - no unsupported claims, no response-time
 * promises.
 */
export function buildLeadNotificationEmail(payload: LeadNotificationPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const { leadId, createdAt, pagePath, input } = payload;

  const rows: Array<[string, string | undefined]> = [
    ['Lead ID', leadId],
    ['Submitted at', createdAt],
    ['Submitted from page', pagePath],
    ['Full name', input.fullName],
    ['Phone', input.phone],
    ['Email', input.email],
    ['Requested service', input.service],
    ['City', input.city],
    ['Service location', input.serviceLocation],
    ['Project description', input.projectDescription],
    ['Preferred contact method', input.preferredContactMethod],
    ['Preferred timing', input.preferredTiming],
    ['Property type', input.propertyType],
    ['Estimated project size', input.estimatedProjectSize],
  ];
  const definedRows = rows.filter(
    (entry): entry is [string, string] => entry[1] !== undefined && entry[1] !== '',
  );

  const html = `<h1>New GreenCal quote request</h1><table cellpadding="4">${definedRows
    .map(
      ([label, value]) =>
        `<tr><td><strong>${escapeHtml(label)}</strong></td><td>${escapeHtml(value)}</td></tr>`,
    )
    .join('')}</table>`;

  const text = definedRows.map(([label, value]) => `${label}: ${value}`).join('\n');

  return {
    subject: `New quote request - ${input.service} (${leadId})`,
    html,
    text,
  };
}

/**
 * Pure content builder for the customer-facing confirmation, exported for
 * direct unit testing. Factual only - no price, no availability promise,
 * no guarantee, no estimated response time beyond the same "soon" already
 * used in the on-page success message (QuoteForm.astro), so the two
 * customer-facing surfaces stay consistent.
 */
export function buildCustomerConfirmationEmail(payload: LeadNotificationPayload): {
  subject: string;
  html: string;
  text: string;
} {
  const { leadId, input } = payload;
  const name = escapeHtml(input.fullName.split(' ')[0] || input.fullName);
  const service = escapeHtml(input.service);

  const html = `<p>Hi ${name},</p><p>Thank you for contacting GreenCal Pressure Washing. We've received your request (${escapeHtml(
    service,
  )}) and will be in touch soon at the contact information you provided.</p><p>If you need to reach us sooner, please call or email us directly.</p><p style="color:#666;font-size:12px;">Reference: ${escapeHtml(
    leadId,
  )}</p>`;

  const text = `Hi ${input.fullName.split(' ')[0] || input.fullName},\n\nThank you for contacting GreenCal Pressure Washing. We've received your request (${input.service}) and will be in touch soon at the contact information you provided.\n\nIf you need to reach us sooner, please call or email us directly.\n\nReference: ${leadId}`;

  return {
    subject: 'We received your request - GreenCal Pressure Washing',
    html,
    text,
  };
}

/**
 * The real, GreenCal-owned Resend implementation. Only ever constructed
 * from the trusted server route with the server-only API key - never
 * imported or instantiated from client-side code. Uses Resend's
 * idempotency-key support (keyed by lead id) so a retried request never
 * sends a duplicate email.
 */
export function createResendNotificationSender(
  apiKey: string,
  fromAddress: string,
  recipientEmail: string,
): NotificationSender {
  const client = new Resend(apiKey);

  return {
    async sendLeadNotification(payload) {
      const { subject, html, text } = buildLeadNotificationEmail(payload);

      try {
        const response = await client.emails.send(
          {
            from: fromAddress,
            to: recipientEmail,
            subject,
            html,
            text,
          },
          { idempotencyKey: `quote-lead-${payload.leadId}` },
        );

        if (response.error) {
          return { ok: false, error: response.error.message };
        }
        return { ok: true, providerId: response.data?.id ?? 'unknown' };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'unknown_send_error' };
      }
    },

    async sendCustomerConfirmation(payload) {
      const { subject, html, text } = buildCustomerConfirmationEmail(payload);

      try {
        const response = await client.emails.send(
          {
            from: fromAddress,
            to: payload.input.email,
            subject,
            html,
            text,
          },
          { idempotencyKey: `quote-lead-confirm-${payload.leadId}` },
        );

        if (response.error) {
          return { ok: false, error: response.error.message };
        }
        return { ok: true, providerId: response.data?.id ?? 'unknown' };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'unknown_send_error' };
      }
    },
  };
}
