/**
 * Job state machine. Transition rules mirror the Growth System Plan's Job
 * table exactly. The In Progress -> Service Completed edge additionally
 * requires the technician's hard-required completion fields
 * (servicePerformed, workCompletedDescription) to be non-empty, per the
 * plan's technician-completion model.
 */

import type { Job, JobCompletionRecord, JobStatus } from '../types/job';
import type { ActorCategory, TransitionContext, TransitionResult } from '../transition';
import { isAutomatedActor } from '../transition';

interface JobTransitionRule {
  readonly to: JobStatus;
  readonly from: readonly JobStatus[];
  readonly allowedActors: readonly ActorCategory[];
  readonly requiresReason: boolean;
}

const NON_TERMINAL_JOB_STATUSES: readonly JobStatus[] = [
  'draft',
  'scheduled',
  'assigned',
  'in-progress',
  'service-completed',
  'awaiting-office-review',
  'completed',
  'follow-up-required',
];

const JOB_TRANSITION_RULES: readonly JobTransitionRule[] = [
  {
    to: 'scheduled',
    from: ['draft'],
    allowedActors: ['office-manager', 'dispatcher'],
    requiresReason: false,
  },
  { to: 'assigned', from: ['scheduled'], allowedActors: ['dispatcher'], requiresReason: false },
  {
    to: 'canceled',
    from: ['scheduled', 'assigned'],
    allowedActors: ['office-manager', 'dispatcher'],
    requiresReason: true,
  },
  {
    to: 'canceled',
    from: NON_TERMINAL_JOB_STATUSES,
    allowedActors: ['office-manager', 'owner-admin'],
    requiresReason: true,
  },
  { to: 'in-progress', from: ['assigned'], allowedActors: ['technician'], requiresReason: false },
  {
    to: 'service-completed',
    from: ['in-progress'],
    allowedActors: ['technician'],
    requiresReason: false,
  },
  {
    to: 'awaiting-office-review',
    from: ['service-completed'],
    allowedActors: ['automation'],
    requiresReason: false,
  },
  {
    to: 'completed',
    from: ['awaiting-office-review'],
    allowedActors: ['office-manager'],
    requiresReason: false,
  },
  {
    to: 'follow-up-required',
    from: ['awaiting-office-review'],
    allowedActors: ['office-manager'],
    requiresReason: true,
  },
  {
    to: 'assigned',
    from: ['follow-up-required'],
    allowedActors: ['dispatcher'],
    requiresReason: false,
  },
  {
    to: 'in-progress',
    from: ['follow-up-required'],
    allowedActors: ['dispatcher'],
    requiresReason: false,
  },
  {
    to: 'follow-up-required',
    from: ['completed'],
    allowedActors: ['office-manager'],
    requiresReason: true,
  },
];

function findRules(from: JobStatus, to: JobStatus): readonly JobTransitionRule[] {
  return JOB_TRANSITION_RULES.filter((rule) => rule.to === to && rule.from.includes(from));
}

export interface JobTransitionOptions {
  /** Required only for the In Progress -> Service Completed edge. */
  readonly completionRecord?: JobCompletionRecord;
}

export function transitionJob(
  job: Job,
  requestedStatus: JobStatus,
  context: TransitionContext,
  options: JobTransitionOptions = {},
): TransitionResult<JobStatus, Job> {
  const currentStatus = job.status;
  const matchingRules = findRules(currentStatus, requestedStatus);

  if (matchingRules.length === 0) {
    return {
      outcome: 'rejected',
      currentState: currentStatus,
      requestedState: requestedStatus,
      errorCode: 'illegal-transition',
      reason: `No approved edge from "${currentStatus}" to "${requestedStatus}".`,
    };
  }

  const authorizedRule = matchingRules.find((rule) =>
    rule.allowedActors.includes(context.actorCategory),
  );
  if (!authorizedRule) {
    return {
      outcome: 'rejected',
      currentState: currentStatus,
      requestedState: requestedStatus,
      errorCode: 'unauthorized-actor',
      reason: `Actor category "${context.actorCategory}" is not authorized for "${currentStatus}" -> "${requestedStatus}".`,
      unauthorizedActorCategory: context.actorCategory,
    };
  }

  if (authorizedRule.requiresReason && !context.reason) {
    return {
      outcome: 'rejected',
      currentState: currentStatus,
      requestedState: requestedStatus,
      errorCode: 'missing-precondition',
      reason: `A reason is required for "${currentStatus}" -> "${requestedStatus}".`,
      missingPreconditions: ['reason'],
    };
  }

  if (currentStatus === 'in-progress' && requestedStatus === 'service-completed') {
    const missing: string[] = [];
    const record = options.completionRecord;
    if (!record || record.servicePerformed.trim().length === 0) {
      missing.push('completionRecord.servicePerformed');
    }
    if (!record || record.workCompletedDescription.trim().length === 0) {
      missing.push('completionRecord.workCompletedDescription');
    }
    if (missing.length > 0) {
      return {
        outcome: 'rejected',
        currentState: currentStatus,
        requestedState: requestedStatus,
        errorCode: 'missing-precondition',
        reason: 'Technician completion record is missing hard-required fields.',
        missingPreconditions: missing,
      };
    }
  }

  const nextJob: Job = { ...job, status: requestedStatus };

  return {
    outcome: 'success',
    previousState: currentStatus,
    nextState: requestedStatus,
    entity: nextJob,
    auditRecord: {
      entityType: 'Job',
      entityId: job.id,
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
