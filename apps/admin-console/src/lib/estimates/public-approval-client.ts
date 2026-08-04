import {
  createDbClient,
  createSupabaseEstimateRepository,
  createSupabaseEstimateLineItemRepository,
  type EstimateRepository,
  type EstimateLineItemRepository,
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
