import type { JobStatus } from '@ai-company-os/core-models';
import type { BadgeTone } from './components/Badge';

const TONE_BY_STATUS: Record<JobStatus, BadgeTone> = {
  draft: 'neutral',
  scheduled: 'neutral',
  assigned: 'neutral',
  'in-progress': 'warning',
  'service-completed': 'success',
  'awaiting-office-review': 'warning',
  completed: 'success',
  'follow-up-required': 'warning',
  canceled: 'danger',
};

export function jobStatusTone(status: JobStatus): BadgeTone {
  return TONE_BY_STATUS[status];
}
