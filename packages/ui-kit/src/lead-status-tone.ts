import type { LeadStatus } from '@ai-company-os/core-models';
import type { BadgeTone } from './components/Badge';

const TONE_BY_STATUS: Record<LeadStatus, BadgeTone> = {
  new: 'neutral',
  'contact-attempted': 'neutral',
  contacted: 'neutral',
  qualified: 'success',
  'estimate-requested': 'success',
  'estimate-sent': 'success',
  booked: 'success',
  disqualified: 'warning',
  lost: 'danger',
  spam: 'danger',
  duplicate: 'danger',
};

export function leadStatusTone(status: LeadStatus): BadgeTone {
  return TONE_BY_STATUS[status];
}
