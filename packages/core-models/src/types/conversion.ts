import type { ConversionEventId, LeadId } from '../ids';
import type { Money } from '../money';

export type ConversionEventCategory = 'engagement' | 'lead' | 'business-result';

export type ConversionEventName =
  | 'phone-click'
  | 'email-click'
  | 'form-start'
  | 'review-link-click'
  | 'service-page-view'
  | 'form-success'
  | 'connected-call'
  | 'qualified-call'
  | 'lead-created'
  | 'lead-qualified'
  | 'lead-disqualified'
  | 'estimate-scheduled'
  | 'estimate-sent'
  | 'job-booked'
  | 'job-completed'
  | 'invoice-paid'
  | 'revenue-recorded'
  | 'review-received'
  | 'project-published';

/**
 * A tracked lifecycle event, never itself a workflow state - see
 * state-machines/** for the actual entities that own status. No event is
 * emitted, persisted, or sent to any analytics platform here.
 */
export interface ConversionEvent {
  readonly id: ConversionEventId;
  readonly name: ConversionEventName;
  readonly category: ConversionEventCategory;
  readonly occurredAt: string;
  readonly leadId?: LeadId;
  readonly deduplicationKey: string;
  readonly classification: 'primary' | 'secondary';
  readonly adsImportEligible: boolean;
  readonly value?: Money;
  readonly containsPersonalData: boolean;
}
