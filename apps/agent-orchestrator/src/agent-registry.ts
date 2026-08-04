import type { TaskType } from '@ai-company-os/agent-sdk';

/**
 * The named specialist agents Jervis coordinates (owner directive: "Jervis,
 * which coordinates Emma + Estimate/Scheduling/Operations/Review/SEO/
 * Media/Follow-up agents"). Mapped onto the existing, closed `TaskType`
 * union from packages/agent-sdk rather than inventing new task types -
 * see DECISIONS.md ADR-0017 for why. `coding`/`debugging` are
 * deliberately unassigned here - those are internal dev-automation task
 * types, not part of this GreenCal-facing agent roster.
 *
 * This registry is data, not a shared type contract, so it lives here in
 * apps/agent-orchestrator rather than in packages/agent-sdk, which is
 * documented as "types only" (see packages/agent-sdk/README.md).
 */
export type AgentId =
  | 'emma'
  | 'estimate-agent'
  | 'scheduling-agent'
  | 'operations-agent'
  | 'review-agent'
  | 'seo-agent'
  | 'media-agent'
  | 'followup-agent';

export interface AgentDescriptor {
  agentId: AgentId;
  displayName: string;
  description: string;
  permittedTaskTypes: TaskType[];
}

export const AGENT_REGISTRY: Record<AgentId, AgentDescriptor> = {
  emma: {
    agentId: 'emma',
    displayName: 'Emma',
    description: 'Customer-facing conversational agent for GreenCal (chat/voice-style responses).',
    permittedTaskTypes: ['customer-response'],
  },
  'estimate-agent': {
    agentId: 'estimate-agent',
    displayName: 'Estimate Agent',
    description:
      'Qualifies leads and summarizes them for estimate creation - see core-models Lead/Estimate.',
    permittedTaskTypes: ['lead-qualification', 'crm-summary'],
  },
  'scheduling-agent': {
    agentId: 'scheduling-agent',
    displayName: 'Scheduling Agent',
    description:
      'Summarizes and prioritizes bookings/jobs for dispatch. Does not itself perform Booking/Job state transitions - those remain deterministic CRM actions via apps/admin-console (see core-models Job state machine).',
    permittedTaskTypes: ['crm-summary'],
  },
  'operations-agent': {
    agentId: 'operations-agent',
    displayName: 'Operations Agent',
    description: 'Monitors site/service health and summarizes operational issues.',
    permittedTaskTypes: ['website-monitoring', 'crm-summary'],
  },
  'review-agent': {
    agentId: 'review-agent',
    displayName: 'Review Agent',
    description:
      'Drafts review-request outreach after a completed Job (see core-models ReviewRequest state machine) - drafts only, a human sends.',
    permittedTaskTypes: ['customer-response'],
  },
  'seo-agent': {
    agentId: 'seo-agent',
    displayName: 'SEO Agent',
    description: 'Researches SEO topics and drafts supporting content.',
    permittedTaskTypes: ['seo-research', 'content-drafting', 'commercial-prospect-research'],
  },
  'media-agent': {
    agentId: 'media-agent',
    displayName: 'Media Agent',
    description:
      'Reviews job before/after photography for publication quality and consent compliance (see core-models PhotoAsset).',
    permittedTaskTypes: ['photo-review'],
  },
  'followup-agent': {
    agentId: 'followup-agent',
    displayName: 'Follow-up Agent',
    description: 'Drafts follow-up outreach for stalled leads or post-job check-ins.',
    permittedTaskTypes: ['customer-response', 'crm-summary'],
  },
};

export function isAgentPermittedForTaskType(agentId: AgentId, taskType: TaskType): boolean {
  return AGENT_REGISTRY[agentId].permittedTaskTypes.includes(taskType);
}
