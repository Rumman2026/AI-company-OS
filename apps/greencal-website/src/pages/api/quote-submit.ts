import type { APIRoute } from 'astro';
import { submitQuoteForm } from '../../lib/quote-form/submit';
import { unavailableAdapter } from '../../lib/quote-form/adapter';
import { getServerConfig } from '../../lib/quote-form/server-config';
import { createSupabaseLeadStore } from '../../lib/quote-form/lead-store';
import { createResendNotificationSender } from '../../lib/quote-form/notification-sender';
import { createSupabaseResendAdapter } from '../../lib/quote-form/supabase-resend-adapter';
import type { QuoteSubmissionResult } from '../../lib/quote-form/types';

// The single on-demand route in this otherwise fully static app - see
// astro.config.mjs and DECISIONS.md ADR-0006. Every other page remains
// prerendered.
export const prerender = false;

function jsonResult(result: QuoteSubmissionResult): Response {
  // Always HTTP 200: the typed `status` field in the body is the source
  // of truth the client already understands (see QuoteForm.astro) -
  // avoids conflating transport-level status with the business result.
  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonResult({
      status: 'delivery_failed',
      message: "We couldn't process that request. Please call or email us directly.",
    });
  }

  const url = new URL(request.url);
  let pagePath = url.pathname;
  let formFields: unknown = body;

  if (typeof body === 'object' && body !== null) {
    const { pagePath: rawPagePath, ...rest } = body as Record<string, unknown>;
    if (typeof rawPagePath === 'string' && rawPagePath.length > 0) {
      pagePath = rawPagePath;
    }
    formFields = rest;
  }
  // If `body` was not an object, formFields stays as the raw non-object
  // value - submitQuoteForm's validation layer rejects it as malformed.

  const serverConfig = getServerConfig();
  const adapter = serverConfig
    ? createSupabaseResendAdapter(
        createSupabaseLeadStore(serverConfig.supabaseUrl, serverConfig.supabaseServiceRoleKey),
        createResendNotificationSender(
          serverConfig.resendApiKey,
          serverConfig.resendFromAddress,
          serverConfig.notificationRecipientEmail,
        ),
      )
    : unavailableAdapter;

  const result = await submitQuoteForm(formFields, { pagePath, adapter });
  return jsonResult(result);
};
