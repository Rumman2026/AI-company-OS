import {
  isNonEmptyString,
  isPlausibleEmail,
  isPlausibleHttpsUrl,
} from './server-config-validation';

export interface ServerConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  resendApiKey: string;
  resendFromAddress: string;
  notificationRecipientEmail: string;
}

/**
 * Reads the server-only, privileged configuration required for live quote
 * delivery. All five variables are required together - if any one is
 * missing or malformed, this returns `null` and the API route falls back
 * to the honest `unavailableAdapter` (pending_configuration). Never
 * guesses, never falls back to a partial/sample configuration.
 *
 * Only ever imported from the trusted server route
 * (src/pages/api/quote-submit.ts) - never from Node-level unit tests or
 * any client-side code. `import.meta.env` here reads server-only env vars
 * (no `PUBLIC_` prefix), which Astro never inlines into the client bundle.
 */
export function getServerConfig(): ServerConfig | null {
  const env = import.meta.env;

  const supabaseUrl = env.SUPABASE_URL;
  const supabaseServiceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;
  const resendApiKey = env.RESEND_API_KEY;
  const resendFromAddress = env.RESEND_FROM_ADDRESS;
  const notificationRecipientEmail = env.NOTIFICATION_RECIPIENT_EMAIL;

  if (
    !isPlausibleHttpsUrl(supabaseUrl) ||
    !isNonEmptyString(supabaseServiceRoleKey) ||
    !isNonEmptyString(resendApiKey) ||
    !isNonEmptyString(resendFromAddress) ||
    !isPlausibleEmail(notificationRecipientEmail)
  ) {
    return null;
  }

  return {
    supabaseUrl,
    supabaseServiceRoleKey,
    resendApiKey,
    resendFromAddress,
    notificationRecipientEmail,
  };
}
