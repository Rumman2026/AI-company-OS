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
  ArchivableContact,
  FindOrCreateContactInput,
  FindOrCreateContactResult,
  GetContactResult,
  ListContactsResult,
  ListContactsOptions,
  LinkCompanyResult,
  ArchiveContactResult,
  RestoreContactResult,
} from './contact-repository';

export { createSupabaseCompanyRepository } from './company-repository';
export type {
  CompanyRepository,
  ArchivableCompany,
  CreateCompanyInput,
  CreateCompanyResult,
  GetCompanyResult,
  ListCompaniesResult,
  ListCompaniesOptions,
  ArchiveCompanyResult,
  RestoreCompanyResult,
} from './company-repository';

export { createSupabaseLeadRepository } from './lead-repository';
export type {
  LeadRepository,
  ArchivableLead,
  CreateLeadResult,
  TransitionLeadResult,
  GetLeadResult,
  ListLeadsResult,
  ListLeadsOptions,
  ArchiveLeadResult,
  RestoreLeadResult,
} from './lead-repository';

export { createSupabaseAuditLogRepository } from './audit-log-repository';
export type {
  AuditLogRepository,
  WriteAuditRecordResult,
  ListAuditRecordsResult,
  ListAuditRecordsOptions,
} from './audit-log-repository';

export type { MembershipRole } from './membership-types';

export { createSupabaseBusinessProfileRepository } from './business-profile-repository';
export type {
  BusinessProfile,
  BusinessProfileRepository,
  UpdateBusinessProfileInput,
  UploadBusinessLogoInput,
  GetBusinessProfileResult,
  UpdateBusinessProfileResult,
  UploadBusinessLogoResult,
} from './business-profile-repository';

export { createSupabaseBusinessServiceAreaRepository } from './business-service-area-repository';
export type {
  BusinessServiceArea,
  BusinessServiceAreaRepository,
  CreateServiceAreaResult,
  ListServiceAreasResult,
  DeleteServiceAreaResult,
} from './business-service-area-repository';

export { createSupabaseBusinessHoursRepository } from './business-hours-repository';
export type {
  DayOfWeek,
  BusinessDayHours,
  SetBusinessDayHoursInput,
  BusinessHoursRepository,
  ListBusinessHoursResult,
  SetBusinessHoursResult,
} from './business-hours-repository';

export { createSupabaseTeamRosterRepository } from './team-roster-repository';
export type {
  TeamMember,
  TeamRosterRepository,
  ListTeamRosterResult,
  GrantRoleResult,
  RevokeRoleResult,
} from './team-roster-repository';

export { createSupabaseEstimateRepository } from './estimate-repository';
export type {
  EstimateRepository,
  CreateEstimateInput,
  CreateEstimateResult,
  GetEstimateResult,
  ListEstimatesResult,
  ListEstimatesOptions,
  ApproveEstimateResult,
  SetEstimatePricingInput,
  SetEstimatePricingResult,
  GenerateCustomerApprovalLinkResult,
  GetEstimateByPublicTokenResult,
  ApproveEstimateByCustomerTokenResult,
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

export { createSupabaseNoteRepository } from './note-repository';
export type {
  NoteRepository,
  CreateNoteInput,
  CreateNoteResult,
  ListNotesResult,
  ListNotesOptions,
} from './note-repository';

export { createSupabaseTaskRepository } from './task-repository';
export type {
  TaskRepository,
  CreateTaskInput,
  CreateTaskResult,
  ListTasksResult,
  ListTasksOptions,
  CompleteTaskResult,
} from './task-repository';

export { createSupabasePhotoAssetRepository } from './photo-asset-repository';
export type {
  PhotoAssetRepository,
  UploadPhotoInput,
  UploadPhotoResult,
  ListPhotosResult,
  PhotoWithSignedUrl,
} from './photo-asset-repository';

export { createSupabaseServicePackageRepository } from './service-package-repository';
export type {
  ServicePackageRepository,
  CreateServicePackageInput,
  CreateServicePackageResult,
  ListServicePackagesResult,
  ListServicePackagesOptions,
  SetServicePackageActiveResult,
} from './service-package-repository';

export { createSupabaseEstimateLineItemRepository } from './estimate-line-item-repository';
export type {
  EstimateLineItemRepository,
  CreateEstimateLineItemInput,
  CreateEstimateLineItemResult,
  ListEstimateLineItemsResult,
  DeleteEstimateLineItemResult,
} from './estimate-line-item-repository';

export { createSupabaseEstimateAttachmentRepository } from './estimate-attachment-repository';
export type {
  EstimateAttachmentRepository,
  UploadEstimateAttachmentInput,
  UploadEstimateAttachmentResult,
  EstimateAttachmentWithSignedUrl,
  ListEstimateAttachmentsResult,
  DeleteEstimateAttachmentResult,
} from './estimate-attachment-repository';

export {
  createActivityTimelineRepository,
  IMPLEMENTED_TIMELINE_ENTRY_TYPES,
  NOT_YET_IMPLEMENTED_TIMELINE_ENTRY_TYPES,
} from './activity-timeline-repository';
export type {
  ActivityTimelineRepository,
  ActivityTimelineRepositoryDeps,
  TimelineEntry,
  TimelineEntryType,
  ListTimelineOptions,
  ListTimelineResult,
} from './activity-timeline-repository';
