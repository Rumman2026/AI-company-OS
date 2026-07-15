/**
 * Content state machine. Implements the Growth System Plan's actual
 * published 11-state model - "Waiting for photos" / "Waiting for consent"
 * are eligibility preconditions folded into `ContentEligibilityEvidence`,
 * not separate persisted states.
 *
 * Structural publication guarantee: the only rules whose `to` is
 * 'published' require `from` to be 'approved' or 'scheduled', and the only
 * rule reaching 'approved' requires actor category 'content-reviewer'
 * (the state-machine table is the authorization source of truth, not the
 * broader roles/permissions model, which is out of scope for this slice).
 * 'ai-drafting-service' appears in exactly one rule in this entire table:
 * eligible-for-draft -> draft-generated. It is never an allowed actor for
 * any other edge, including the changes-requested -> under-review
 * resubmission edge, where this implementation deliberately narrows the
 * Growth System Plan's looser "AI or human editor" phrasing to human
 * actors only, in favor of the more explicit, repeatedly-emphasized
 * safety framing in the approved implementation instructions ("AI-
 * accessible workflow may reach no further than Draft Generated"). See the
 * final implementation report.
 */

import type {
  ContentDraft,
  ContentStatus,
  ContentEligibilityEvidence,
  ContentApprovalDecision,
  ContentPublicationEvidence,
} from '../types/content';
import type { ActorCategory, TransitionContext, TransitionResult } from '../transition';
import { isAutomatedActor } from '../transition';

interface ContentTransitionRule {
  readonly to: ContentStatus;
  readonly from: readonly ContentStatus[];
  readonly allowedActors: readonly ActorCategory[];
  readonly requiresReason: boolean;
}

const CONTENT_TRANSITION_RULES: readonly ContentTransitionRule[] = [
  {
    to: 'eligible-for-draft',
    from: ['not-eligible'],
    allowedActors: ['automation'],
    requiresReason: false,
  },
  {
    to: 'draft-generated',
    from: ['eligible-for-draft'],
    allowedActors: ['ai-drafting-service'],
    requiresReason: false,
  },
  {
    to: 'under-review',
    from: ['draft-generated'],
    allowedActors: ['automation'],
    requiresReason: false,
  },
  {
    to: 'changes-requested',
    from: ['under-review'],
    allowedActors: ['content-reviewer'],
    requiresReason: true,
  },
  {
    to: 'under-review',
    from: ['changes-requested'],
    allowedActors: ['content-reviewer', 'marketing-editor'],
    requiresReason: false,
  },
  {
    to: 'approved',
    from: ['under-review'],
    allowedActors: ['content-reviewer'],
    requiresReason: false,
  },
  {
    to: 'rejected',
    from: ['under-review', 'changes-requested'],
    allowedActors: ['content-reviewer'],
    requiresReason: true,
  },
  {
    to: 'scheduled',
    from: ['approved'],
    allowedActors: ['content-reviewer', 'marketing-editor'],
    requiresReason: false,
  },
  {
    to: 'published',
    from: ['approved', 'scheduled'],
    allowedActors: ['scheduled-publishing-service'],
    requiresReason: false,
  },
  {
    to: 'unpublished',
    from: ['published'],
    allowedActors: ['owner-admin', 'content-reviewer'],
    requiresReason: true,
  },
  { to: 'archived', from: ['published'], allowedActors: ['owner-admin'], requiresReason: false },
  { to: 'archived', from: ['unpublished'], allowedActors: ['owner-admin'], requiresReason: false },
];

function findRules(from: ContentStatus, to: ContentStatus): readonly ContentTransitionRule[] {
  return CONTENT_TRANSITION_RULES.filter((rule) => rule.to === to && rule.from.includes(from));
}

function missingEligibilityFields(evidence: ContentEligibilityEvidence): string[] {
  const missing: string[] = [];
  for (const [key, value] of Object.entries(evidence)) {
    if (value !== true) {
      missing.push(key);
    }
  }
  return missing;
}

function missingPublicationFields(evidence: ContentPublicationEvidence): string[] {
  const missing: string[] = [];
  for (const [key, value] of Object.entries(evidence)) {
    if (value !== true) {
      missing.push(key);
    }
  }
  return missing;
}

export interface ContentTransitionOptions {
  /** Required only for not-eligible -> eligible-for-draft. */
  readonly eligibilityEvidence?: ContentEligibilityEvidence;
  /** Required only for under-review -> approved. */
  readonly approvalDecision?: ContentApprovalDecision;
  /** Required only for approved/scheduled -> published. */
  readonly publicationEvidence?: ContentPublicationEvidence;
}

export function transitionContent(
  content: ContentDraft,
  requestedStatus: ContentStatus,
  context: TransitionContext,
  options: ContentTransitionOptions = {},
): TransitionResult<ContentStatus, ContentDraft> {
  const currentStatus = content.status;
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

  if (currentStatus === 'not-eligible' && requestedStatus === 'eligible-for-draft') {
    if (!options.eligibilityEvidence) {
      return rejectMissing(currentStatus, requestedStatus, ['eligibilityEvidence']);
    }
    const missing = missingEligibilityFields(options.eligibilityEvidence);
    if (missing.length > 0) {
      return rejectMissing(currentStatus, requestedStatus, missing);
    }
  }

  if (currentStatus === 'under-review' && requestedStatus === 'approved') {
    if (!options.approvalDecision || options.approvalDecision.decision !== 'approved') {
      return rejectMissing(currentStatus, requestedStatus, ['approvalDecision']);
    }
  }

  if (
    (currentStatus === 'approved' || currentStatus === 'scheduled') &&
    requestedStatus === 'published'
  ) {
    if (!options.publicationEvidence) {
      return rejectMissing(currentStatus, requestedStatus, ['publicationEvidence']);
    }
    const missing = missingPublicationFields(options.publicationEvidence);
    if (missing.length > 0) {
      return rejectMissing(currentStatus, requestedStatus, missing);
    }
  }

  const nextContent: ContentDraft = { ...content, status: requestedStatus };

  return {
    outcome: 'success',
    previousState: currentStatus,
    nextState: requestedStatus,
    entity: nextContent,
    auditRecord: {
      entityType: 'ContentDraft',
      entityId: content.id,
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

function rejectMissing(
  currentState: ContentStatus,
  requestedState: ContentStatus,
  missingPreconditions: readonly string[],
): TransitionResult<ContentStatus, ContentDraft> {
  return {
    outcome: 'rejected',
    currentState,
    requestedState,
    errorCode: 'missing-precondition',
    reason: `"${currentState}" -> "${requestedState}" is missing required precondition evidence.`,
    missingPreconditions,
  };
}
