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
  GetContactResult,
  ListContactsResult,
  ListContactsOptions,
} from './contact-repository';

export { createSupabaseLeadRepository } from './lead-repository';
export type {
  LeadRepository,
  CreateLeadResult,
  TransitionLeadResult,
  GetLeadResult,
  ListLeadsResult,
  ListLeadsOptions,
} from './lead-repository';

export { createSupabaseAuditLogRepository } from './audit-log-repository';
export type { AuditLogRepository, WriteAuditRecordResult } from './audit-log-repository';

export type { MembershipRole } from './membership-types';

export { createSupabaseEstimateRepository } from './estimate-repository';
export type {
  EstimateRepository,
  CreateEstimateInput,
  CreateEstimateResult,
  GetEstimateResult,
  ListEstimatesResult,
  ListEstimatesOptions,
} from './estimate-repository';

export { createSupabaseBookingRepository } from './booking-repository';
export type {
  BookingRepository,
  CreateBookingInput,
  CreateBookingResult,
  GetBookingResult,
  ListBookingsResult,
  ListBookingsOptions,
  LinkJobResult,
} from './booking-repository';

export { createSupabaseJobRepository } from './job-repository';
export type {
  JobRepository,
  CreateJobResult,
  TransitionJobResult,
  GetJobResult,
  ListJobsResult,
  ListJobsOptions,
} from './job-repository';
