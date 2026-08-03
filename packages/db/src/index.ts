/**
 * Public entry point for @ai-company-os/db.
 *
 * Persistence for the domain model already defined in
 * @ai-company-os/core-models - see that package's README for the entities
 * and state machines this repository layer implements, and
 * DECISIONS.md ADR-0009 for why persistence, not a new data model, is
 * this package's job.
 */

export { createDbClient } from './supabase-client';
export type { MinimalSupabaseClient } from './supabase-client';

export { createSupabaseContactRepository } from './contact-repository';
export type {
  ContactRepository,
  FindOrCreateContactInput,
  FindOrCreateContactResult,
} from './contact-repository';

export { createSupabaseLeadRepository } from './lead-repository';
export type { LeadRepository, CreateLeadResult, TransitionLeadResult } from './lead-repository';

export { createSupabaseAuditLogRepository } from './audit-log-repository';
export type { AuditLogRepository, WriteAuditRecordResult } from './audit-log-repository';

export type { MembershipRole } from './membership-types';
