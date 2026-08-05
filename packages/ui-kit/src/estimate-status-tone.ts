import type { EstimateStatus } from '@ai-company-os/core-models';
import type { BadgeTone } from './components/Badge';

const TONE_BY_STATUS: Record<EstimateStatus, BadgeTone> = {
  draft: 'neutral',
  approved: 'success',
  rejected: 'danger',
};

export function estimateStatusTone(status: EstimateStatus): BadgeTone {
  return TONE_BY_STATUS[status];
}
