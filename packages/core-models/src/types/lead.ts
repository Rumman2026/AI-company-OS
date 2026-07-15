import type { ContactId, LeadId } from '../ids';
import type { LeadAttribution } from './attribution';

export type LeadStatus =
  | 'new'
  | 'contact-attempted'
  | 'contacted'
  | 'qualified'
  | 'disqualified'
  | 'estimate-requested'
  | 'estimate-sent'
  | 'booked'
  | 'lost'
  | 'spam'
  | 'duplicate';

export interface Lead {
  readonly id: LeadId;
  readonly contactId: ContactId;
  readonly status: LeadStatus;
  /**
   * Immutable once set. Ordinary state transitions never rewrite this field
   * - see state-machines/lead.ts.
   */
  readonly attribution: LeadAttribution;
  readonly duplicateOfLeadId?: LeadId;
  readonly createdAt: string;
}
