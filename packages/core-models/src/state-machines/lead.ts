/**
 * Lead state machine. Transition rules mirror the Growth System Plan's Lead
 * table exactly.
 *
 * Deferred, not implemented (owner-approved exclusion): "Owner/Admin may
 * correct a terminal Lead" has no defined target state anywhere in the
 * approved plan, so no correction/reopen/reset/attribution-override
 * mechanism exists here. See the final implementation report.
 *
 * "(future)" hedges in the plan (customer self-serve estimate requests,
 * automatable estimate-sending, booking-platform webhooks) are excluded
 * from this slice's authorized actor sets - they describe capabilities the
 * plan explicitly marks as not yet real, not capabilities approved now.
 */

import type { Lead, LeadStatus } from '../types/lead';
import type { ActorCategory, TransitionContext, TransitionResult } from '../transition';
import { isAutomatedActor } from '../transition';

interface LeadTransitionRule {
  readonly to: LeadStatus;
  readonly from: readonly LeadStatus[];
  readonly allowedActors: readonly ActorCategory[];
  readonly requiresReason: boolean;
}

const NON_TERMINAL_LEAD_STATUSES: readonly LeadStatus[] = [
  'new',
  'contact-attempted',
  'contacted',
  'qualified',
  'estimate-requested',
  'estimate-sent',
];

const LEAD_TRANSITION_RULES: readonly LeadTransitionRule[] = [
  {
    to: 'contact-attempted',
    from: ['new', 'contact-attempted'],
    allowedActors: ['office-manager', 'dispatcher', 'automation'],
    requiresReason: false,
  },
  {
    to: 'spam',
    from: ['new'],
    allowedActors: ['office-manager', 'automation'],
    requiresReason: false,
  },
  {
    to: 'duplicate',
    from: ['new'],
    allowedActors: ['office-manager', 'automation'],
    requiresReason: false,
  },
  {
    to: 'contacted',
    from: ['contact-attempted'],
    allowedActors: ['office-manager', 'dispatcher'],
    requiresReason: false,
  },
  {
    to: 'qualified',
    from: ['contacted'],
    allowedActors: ['office-manager'],
    requiresReason: false,
  },
  {
    to: 'disqualified',
    from: ['contacted'],
    allowedActors: ['office-manager'],
    requiresReason: true,
  },
  {
    to: 'estimate-requested',
    from: ['qualified'],
    allowedActors: ['office-manager'],
    requiresReason: false,
  },
  {
    to: 'estimate-sent',
    from: ['estimate-requested'],
    allowedActors: ['office-manager'],
    requiresReason: false,
  },
  {
    to: 'booked',
    from: ['estimate-sent'],
    allowedActors: ['office-manager'],
    requiresReason: false,
  },
  {
    to: 'lost',
    from: NON_TERMINAL_LEAD_STATUSES,
    allowedActors: ['office-manager', 'owner-admin'],
    requiresReason: true,
  },
];

function findRule(from: LeadStatus, to: LeadStatus): LeadTransitionRule | undefined {
  return LEAD_TRANSITION_RULES.find((rule) => rule.to === to && rule.from.includes(from));
}

export function transitionLead(
  lead: Lead,
  requestedStatus: LeadStatus,
  context: TransitionContext,
): TransitionResult<LeadStatus, Lead> {
  const currentStatus = lead.status;
  const rule = findRule(currentStatus, requestedStatus);

  if (!rule) {
    return {
      outcome: 'rejected',
      currentState: currentStatus,
      requestedState: requestedStatus,
      errorCode: 'illegal-transition',
      reason: `No approved edge from "${currentStatus}" to "${requestedStatus}".`,
    };
  }

  if (!rule.allowedActors.includes(context.actorCategory)) {
    return {
      outcome: 'rejected',
      currentState: currentStatus,
      requestedState: requestedStatus,
      errorCode: 'unauthorized-actor',
      reason: `Actor category "${context.actorCategory}" is not authorized for "${currentStatus}" -> "${requestedStatus}".`,
      unauthorizedActorCategory: context.actorCategory,
    };
  }

  if (rule.requiresReason && !context.reason) {
    return {
      outcome: 'rejected',
      currentState: currentStatus,
      requestedState: requestedStatus,
      errorCode: 'missing-precondition',
      reason: `A reason is required for "${currentStatus}" -> "${requestedStatus}".`,
      missingPreconditions: ['reason'],
    };
  }

  const nextLead: Lead = { ...lead, status: requestedStatus };

  return {
    outcome: 'success',
    previousState: currentStatus,
    nextState: requestedStatus,
    entity: nextLead,
    auditRecord: {
      entityType: 'Lead',
      entityId: lead.id,
      action: 'status-change',
      previousValue: currentStatus,
      newValue: requestedStatus,
      actorCategory: context.actorCategory,
      actorId: context.actorId,
      automated: isAutomatedActor(context.actorCategory),
      occurredAt: context.occurredAt,
      reason: context.reason,
      correlationId: context.correlationId,
    },
  };
}
