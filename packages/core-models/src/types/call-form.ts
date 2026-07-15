import type { CallRecordId, FormSubmissionId, LeadId } from '../ids';

export interface CallRecord {
  readonly id: CallRecordId;
  readonly leadId?: LeadId;
  readonly callSessionReference: string;
  readonly connected: boolean;
  readonly occurredAt: string;
}

export interface FormSubmission {
  readonly id: FormSubmissionId;
  readonly leadId?: LeadId;
  readonly formSessionReference: string;
  readonly submittedAt: string;
}
