import type {
  BookingId,
  JobCompletionRecordId,
  JobId,
  JobServiceId,
  LeadId,
  PhotoAssetId,
  ServiceId,
  TechnicianId,
} from '../ids';

export type JobStatus =
  | 'draft'
  | 'scheduled'
  | 'assigned'
  | 'in-progress'
  | 'service-completed'
  | 'awaiting-office-review'
  | 'completed'
  | 'follow-up-required'
  | 'canceled';

export interface Job {
  readonly id: JobId;
  readonly leadId: LeadId;
  readonly bookingId: BookingId;
  readonly status: JobStatus;
  readonly technicianId?: TechnicianId;
  readonly scheduledAt?: string;
  readonly createdAt: string;
}

export interface JobService {
  readonly id: JobServiceId;
  readonly jobId: JobId;
  readonly serviceId: ServiceId;
}

export interface Technician {
  readonly id: TechnicianId;
  readonly displayName: string;
  readonly active: boolean;
}

/**
 * The technician's structured completion submission. `servicePerformed` and
 * `workCompletedDescription` are the hard-required fields gating the
 * In Progress -> Service Completed transition; every other field is soft
 * (missing values are flagged, not blocking) per the Growth System Plan's
 * technician-completion model.
 */
export interface JobCompletionRecord {
  readonly id: JobCompletionRecordId;
  readonly jobId: JobId;
  readonly servicePerformed: string;
  readonly workCompletedDescription: string;
  readonly surfaceType?: string;
  readonly propertyType?: string;
  readonly conditionBeforeService?: string;
  readonly technicianNotes?: string;
  readonly limitationsOrIssues?: string;
  readonly cleanupConfirmed?: boolean;
  readonly customerAcknowledged?: boolean;
  readonly beforePhotoIds: readonly PhotoAssetId[];
  readonly afterPhotoIds: readonly PhotoAssetId[];
  readonly submittedAt: string;
}
