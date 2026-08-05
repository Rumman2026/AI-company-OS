import type { AuditLogRepository } from './audit-log-repository';
import type { LeadRepository } from './lead-repository';
import type { EstimateRepository } from './estimate-repository';
import type { BookingRepository } from './booking-repository';
import type { JobRepository } from './job-repository';
import type { NoteRepository } from './note-repository';
import type { TaskRepository } from './task-repository';
import type { PhotoAssetRepository } from './photo-asset-repository';
import type { InvoiceRepository } from './invoice-repository';
import type { PaymentRepository } from './payment-repository';
import type { ReviewRecordRepository } from './review-record-repository';

/**
 * Every kind of event the Activity Timeline can show - see
 * DECISIONS.md ADR-0025 (original design) and ADR-0039 (wiring
 * `invoice-created`/`payment-received`/`review-received` once
 * Invoice/Payment/ReviewRecord persistence existed, Clusters 27-28).
 * `call-logged`, `sms-sent`, `email-sent`, and `review-request-sent`
 * remain real, named values with no producing code path - no Call/SMS/
 * Email persistence exists anywhere in this repository, and
 * `review-request-sent` specifically requires the automation actor
 * that sends a queued ReviewRequest, which this application has no
 * scheduler for (see ADR-0038) - a request sitting at `not-eligible`
 * has not actually been sent, so it is never reported as one.
 * `listTimelineForContact()` honestly returns zero entries of those
 * four types; nothing here fabricates data to fill the gap.
 */
export type TimelineEntryType =
  | 'lead-created'
  | 'lead-status-change'
  | 'estimate-created'
  | 'estimate-approved'
  | 'appointment-scheduled'
  | 'job-created'
  | 'job-status-change'
  | 'note-added'
  | 'task-created'
  | 'task-completed'
  | 'media-uploaded'
  | 'invoice-created'
  | 'payment-received'
  | 'call-logged'
  | 'sms-sent'
  | 'email-sent'
  | 'review-request-sent'
  | 'review-received';

/** Entry types this repository can actually produce today - see the module doc comment. */
export const IMPLEMENTED_TIMELINE_ENTRY_TYPES: readonly TimelineEntryType[] = [
  'lead-created',
  'lead-status-change',
  'estimate-created',
  'estimate-approved',
  'appointment-scheduled',
  'job-created',
  'job-status-change',
  'note-added',
  'task-created',
  'task-completed',
  'media-uploaded',
  'invoice-created',
  'payment-received',
  'review-received',
];

/** Entry types that exist for forward compatibility only - never produced yet. See the module doc comment. */
export const NOT_YET_IMPLEMENTED_TIMELINE_ENTRY_TYPES: readonly TimelineEntryType[] = [
  'call-logged',
  'sms-sent',
  'email-sent',
  'review-request-sent',
];

export interface TimelineEntry {
  readonly id: string;
  readonly type: TimelineEntryType;
  readonly occurredAt: string;
  /** The staff member who performed the action, if recorded - see DECISIONS.md ADR-0025. */
  readonly actorId?: string;
  readonly summary: string;
  readonly entityType: string;
  readonly entityId: string;
}

export interface ListTimelineOptions {
  readonly types?: readonly TimelineEntryType[];
  readonly actorId?: string;
  /** Inclusive ISO timestamp lower bound. */
  readonly dateFrom?: string;
  /** Inclusive ISO timestamp upper bound. */
  readonly dateTo?: string;
}

export type ListTimelineResult =
  { ok: true; entries: TimelineEntry[] } | { ok: false; error: string };

export interface ActivityTimelineRepository {
  /**
   * Every recorded event for a Contact - directly (Contact-level Notes/
   * Tasks) and transitively through that Contact's Leads and each
   * Lead's Estimates/Bookings/Jobs. Composed at read time from every
   * already-existing, already-tenant-scoped repository - see
   * DECISIONS.md ADR-0025 for why this is not a separate write-time
   * event table. Most recent first; filterable by `types`/`actorId`/
   * date range.
   */
  listTimelineForContact(
    businessId: string,
    contactId: string,
    options?: ListTimelineOptions,
  ): Promise<ListTimelineResult>;
}

export interface ActivityTimelineRepositoryDeps {
  leadRepository: LeadRepository;
  estimateRepository: EstimateRepository;
  bookingRepository: BookingRepository;
  jobRepository: JobRepository;
  noteRepository: NoteRepository;
  taskRepository: TaskRepository;
  photoAssetRepository: PhotoAssetRepository;
  auditLogRepository: AuditLogRepository;
  invoiceRepository: InvoiceRepository;
  paymentRepository: PaymentRepository;
  reviewRecordRepository: ReviewRecordRepository;
}

function matchesFilters(entry: TimelineEntry, options: ListTimelineOptions): boolean {
  if (options.types && !options.types.includes(entry.type)) return false;
  if (options.actorId && entry.actorId !== options.actorId) return false;
  if (options.dateFrom && entry.occurredAt < options.dateFrom) return false;
  if (options.dateTo && entry.occurredAt > options.dateTo) return false;
  return true;
}

export function createActivityTimelineRepository(
  deps: ActivityTimelineRepositoryDeps,
): ActivityTimelineRepository {
  return {
    async listTimelineForContact(businessId, contactId, options = {}) {
      const entries: TimelineEntry[] = [];

      const [notesResult, tasksResult, leadsResult] = await Promise.all([
        deps.noteRepository.listNotes(businessId, { entityType: 'contact', entityId: contactId }),
        deps.taskRepository.listTasks(businessId, { entityType: 'contact', entityId: contactId }),
        deps.leadRepository.listLeads(businessId, { contactId, includeArchived: true }),
      ]);

      if (!notesResult.ok) return { ok: false, error: notesResult.error };
      if (!tasksResult.ok) return { ok: false, error: tasksResult.error };
      if (!leadsResult.ok) return { ok: false, error: leadsResult.error };

      for (const note of notesResult.notes) {
        entries.push({
          id: `note-${note.id}`,
          type: 'note-added',
          occurredAt: note.createdAt,
          actorId: note.authorId,
          summary: note.body,
          entityType: 'contact',
          entityId: contactId,
        });
      }

      for (const task of tasksResult.tasks) {
        entries.push({
          id: `task-created-${task.id}`,
          type: 'task-created',
          occurredAt: task.createdAt,
          actorId: task.createdBy,
          summary: task.title,
          entityType: 'contact',
          entityId: contactId,
        });
        if (task.completed && task.completedAt) {
          entries.push({
            id: `task-completed-${task.id}`,
            type: 'task-completed',
            occurredAt: task.completedAt,
            actorId: task.completedBy,
            summary: task.title,
            entityType: 'contact',
            entityId: contactId,
          });
        }
      }

      for (const lead of leadsResult.leads) {
        entries.push({
          id: `lead-created-${lead.id}`,
          type: 'lead-created',
          occurredAt: lead.createdAt,
          summary: `Lead created (${lead.attribution.channel})`,
          entityType: 'lead',
          entityId: lead.id,
        });

        const [leadAuditResult, leadNotesResult, leadTasksResult, estimatesResult, bookingsResult] =
          await Promise.all([
            deps.auditLogRepository.listAuditRecords(businessId, {
              entityType: 'Lead',
              entityId: lead.id,
            }),
            deps.noteRepository.listNotes(businessId, { entityType: 'lead', entityId: lead.id }),
            deps.taskRepository.listTasks(businessId, { entityType: 'lead', entityId: lead.id }),
            deps.estimateRepository.listEstimates(businessId, { leadId: lead.id }),
            deps.bookingRepository.listBookings(businessId, { leadId: lead.id }),
          ]);

        if (leadAuditResult.ok) {
          for (const record of leadAuditResult.records) {
            entries.push({
              id: `lead-status-${record.id}`,
              type: 'lead-status-change',
              occurredAt: record.occurredAt,
              actorId: record.actorId,
              summary: `Lead status: ${record.previousValue} → ${record.newValue}`,
              entityType: 'lead',
              entityId: lead.id,
            });
          }
        }

        if (leadNotesResult.ok) {
          for (const note of leadNotesResult.notes) {
            entries.push({
              id: `note-${note.id}`,
              type: 'note-added',
              occurredAt: note.createdAt,
              actorId: note.authorId,
              summary: note.body,
              entityType: 'lead',
              entityId: lead.id,
            });
          }
        }

        if (leadTasksResult.ok) {
          for (const task of leadTasksResult.tasks) {
            entries.push({
              id: `task-created-${task.id}`,
              type: 'task-created',
              occurredAt: task.createdAt,
              actorId: task.createdBy,
              summary: task.title,
              entityType: 'lead',
              entityId: lead.id,
            });
            if (task.completed && task.completedAt) {
              entries.push({
                id: `task-completed-${task.id}`,
                type: 'task-completed',
                occurredAt: task.completedAt,
                actorId: task.completedBy,
                summary: task.title,
                entityType: 'lead',
                entityId: lead.id,
              });
            }
          }
        }

        if (estimatesResult.ok) {
          for (const estimate of estimatesResult.estimates) {
            entries.push({
              id: `estimate-created-${estimate.id}`,
              type: 'estimate-created',
              occurredAt: estimate.createdAt,
              actorId: estimate.createdBy,
              summary: estimate.summary,
              entityType: 'estimate',
              entityId: estimate.id,
            });
            if (estimate.status === 'approved' && estimate.approvedAt) {
              entries.push({
                id: `estimate-approved-${estimate.id}`,
                type: 'estimate-approved',
                occurredAt: estimate.approvedAt,
                actorId: estimate.approvedBy,
                summary: estimate.summary,
                entityType: 'estimate',
                entityId: estimate.id,
              });
            }
          }
        }

        if (bookingsResult.ok) {
          for (const booking of bookingsResult.bookings) {
            entries.push({
              id: `appointment-${booking.id}`,
              type: 'appointment-scheduled',
              occurredAt: booking.createdAt,
              actorId: booking.createdBy,
              summary: `Appointment scheduled for ${booking.scheduledAt}`,
              entityType: 'booking',
              entityId: booking.id,
            });

            if (!booking.jobId) continue;

            const [
              jobResult,
              jobAuditResult,
              jobNotesResult,
              jobTasksResult,
              jobPhotosResult,
              jobInvoicesResult,
              jobReviewRecordsResult,
            ] = await Promise.all([
              deps.jobRepository.getJob(businessId, booking.jobId),
              deps.auditLogRepository.listAuditRecords(businessId, {
                entityType: 'Job',
                entityId: booking.jobId,
              }),
              deps.noteRepository.listNotes(businessId, {
                entityType: 'job',
                entityId: booking.jobId,
              }),
              deps.taskRepository.listTasks(businessId, {
                entityType: 'job',
                entityId: booking.jobId,
              }),
              deps.photoAssetRepository.listPhotosForJob(businessId, booking.jobId),
              deps.invoiceRepository.listInvoices(businessId, { jobId: booking.jobId }),
              deps.reviewRecordRepository.listReviewRecordsForJob(businessId, booking.jobId),
            ]);

            if (jobResult.ok) {
              entries.push({
                id: `job-created-${jobResult.job.id}`,
                type: 'job-created',
                occurredAt: jobResult.job.createdAt,
                summary: 'Job created',
                entityType: 'job',
                entityId: jobResult.job.id,
              });
            }

            if (jobAuditResult.ok) {
              for (const record of jobAuditResult.records) {
                entries.push({
                  id: `job-status-${record.id}`,
                  type: 'job-status-change',
                  occurredAt: record.occurredAt,
                  actorId: record.actorId,
                  summary: `Job status: ${record.previousValue} → ${record.newValue}`,
                  entityType: 'job',
                  entityId: booking.jobId,
                });
              }
            }

            if (jobNotesResult.ok) {
              for (const note of jobNotesResult.notes) {
                entries.push({
                  id: `note-${note.id}`,
                  type: 'note-added',
                  occurredAt: note.createdAt,
                  actorId: note.authorId,
                  summary: note.body,
                  entityType: 'job',
                  entityId: booking.jobId,
                });
              }
            }

            if (jobTasksResult.ok) {
              for (const task of jobTasksResult.tasks) {
                entries.push({
                  id: `task-created-${task.id}`,
                  type: 'task-created',
                  occurredAt: task.createdAt,
                  actorId: task.createdBy,
                  summary: task.title,
                  entityType: 'job',
                  entityId: booking.jobId,
                });
                if (task.completed && task.completedAt) {
                  entries.push({
                    id: `task-completed-${task.id}`,
                    type: 'task-completed',
                    occurredAt: task.completedAt,
                    actorId: task.completedBy,
                    summary: task.title,
                    entityType: 'job',
                    entityId: booking.jobId,
                  });
                }
              }
            }

            if (jobPhotosResult.ok) {
              for (const { photo } of jobPhotosResult.photos) {
                entries.push({
                  id: `media-${photo.id}`,
                  type: 'media-uploaded',
                  occurredAt: photo.uploadedAt,
                  actorId: photo.uploadedBy,
                  summary: `${photo.kind} photo uploaded`,
                  entityType: 'job',
                  entityId: booking.jobId,
                });
              }
            }

            if (jobInvoicesResult.ok) {
              for (const invoice of jobInvoicesResult.invoices) {
                entries.push({
                  id: `invoice-created-${invoice.id}`,
                  type: 'invoice-created',
                  occurredAt: invoice.createdAt,
                  summary: `Invoice created (${invoice.totalAmount.amountMinorUnits / 100} ${invoice.totalAmount.currency})`,
                  entityType: 'invoice',
                  entityId: invoice.id,
                });

                const paymentsResult = await deps.paymentRepository.listPaymentsForInvoice(
                  businessId,
                  invoice.id,
                );
                if (paymentsResult.ok) {
                  for (const payment of paymentsResult.payments) {
                    entries.push({
                      id: `payment-received-${payment.id}`,
                      type: 'payment-received',
                      occurredAt: payment.occurredAt,
                      summary: `Payment received (${payment.amount.amountMinorUnits / 100} ${payment.amount.currency})`,
                      entityType: 'invoice',
                      entityId: invoice.id,
                    });
                  }
                }
              }
            }

            if (jobReviewRecordsResult.ok) {
              for (const record of jobReviewRecordsResult.reviewRecords) {
                entries.push({
                  id: `review-received-${record.id}`,
                  type: 'review-received',
                  occurredAt: record.receivedAt,
                  summary: `Review received (${record.sourcePlatform})`,
                  entityType: 'job',
                  entityId: booking.jobId,
                });
              }
            }
          }
        }
      }

      const filtered = entries.filter((entry) => matchesFilters(entry, options));
      filtered.sort((a, b) =>
        a.occurredAt < b.occurredAt ? 1 : a.occurredAt > b.occurredAt ? -1 : 0,
      );

      return { ok: true, entries: filtered };
    },
  };
}
