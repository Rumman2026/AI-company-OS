import type { ReviewRequestStatus } from '@ai-company-os/core-models';
import type { BadgeTone } from './components/Badge';

const TONE_BY_STATUS: Record<ReviewRequestStatus, BadgeTone> = {
  'not-eligible': 'neutral',
  eligible: 'neutral',
  queued: 'warning',
  sent: 'warning',
  delivered: 'warning',
  failed: 'danger',
  'review-received': 'success',
  suppressed: 'danger',
  'opted-out': 'neutral',
};

export function reviewRequestStatusTone(status: ReviewRequestStatus): BadgeTone {
  return TONE_BY_STATUS[status];
}
