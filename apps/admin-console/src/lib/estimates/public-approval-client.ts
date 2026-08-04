import {
  createDbClient,
  createSupabaseEstimateRepository,
  createSupabaseEstimateLineItemRepository,
  createSupabaseTeamRosterRepository,
  createSupabaseNotificationRepository,
  type EstimateRepository,
  type EstimateLineItemRepository,
  type TeamRosterRepository,
  type NotificationRepository,
} from '@ai-company-os/db';
import { getSupabaseServiceRoleEnv } from '../supabase/env';

/**
 * Constructs an EstimateRepository backed by the service-role key,
 * for the public customer-approval routes only - see
 * lib/supabase/env.ts's getSupabaseServiceRoleEnv() doc comment and
 * DECISIONS.md ADR-0030. Returns null if the service-role key is not
 * configured, so callers can show an honest "not available" page
 * rather than throwing.
 */
export function createPublicEstimateRepository(): EstimateRepository | null {
  const env = getSupabaseServiceRoleEnv();
  if (!env) return null;
  const client = createDbClient(env.url, env.serviceRoleKey);
  return createSupabaseEstimateRepository(client);
}

/** Same service-role client, paired with a line-item repository - for the public approval page's read-only itemized display. */
export function createPublicEstimateRepositories(): {
  estimates: EstimateRepository;
  lineItems: EstimateLineItemRepository;
} | null {
  const env = getSupabaseServiceRoleEnv();
  if (!env) return null;
  const client = createDbClient(env.url, env.serviceRoleKey);
  const estimates = createSupabaseEstimateRepository(client);
  const lineItems = createSupabaseEstimateLineItemRepository(client, estimates);
  return { estimates, lineItems };
}

/**
 * Same service-role client, paired with an EstimateRepository, a
 * TeamRosterRepository, and a NotificationRepository - used only by
 * the public approve POST route to notify staff after a customer
 * approves an estimate (see DECISIONS.md ADR-0034). The public route
 * has no authenticated session, so it cannot use the normal
 * anon-key/RLS-enforced client to look up the roster or write a
 * notification.
 */
export function createPublicApprovalNotificationClients(): {
  estimates: EstimateRepository;
  teamRoster: TeamRosterRepository;
  notifications: NotificationRepository;
} | null {
  const env = getSupabaseServiceRoleEnv();
  if (!env) return null;
  const client = createDbClient(env.url, env.serviceRoleKey);
  return {
    estimates: createSupabaseEstimateRepository(client),
    teamRoster: createSupabaseTeamRosterRepository(client),
    notifications: createSupabaseNotificationRepository(client),
  };
}
