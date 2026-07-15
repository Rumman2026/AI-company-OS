/**
 * Review-request state machine. Eligibility never depends on customer
 * sentiment, star rating, satisfaction score, or predicted review quality -
 * no such field exists anywhere in ReviewEligibilityEvidence or the Review
 * Request type. Opt-out and suppression are always respected and are
 * reachable from every non-terminal state. No retry transition exists for
 * `failed` - the approved plan does not define one, so none is invented.
 */

import type { ReviewRequest, ReviewRequestStatus } from '../types/review';
import type { ActorCategory, TransitionContext, TransitionResult } from '../transition';
import { isAutomatedActor } from '../transition';

interface ReviewRequestTransitionRule {
  readonly to: ReviewRequestStatus;
  readonly from: readonly ReviewRequestStatus[];
  readonly allowedActors: readonly ActorCategory[];
}

const NON_TERMINAL_REVIEW_REQUEST_STATUSES: readonly ReviewRequestStatus[] = [
  'not-eligible',
  'eligible',
  'queued',
  'sent',
  'delivered',
  'failed',
];

const ALL_REVIEW_REQUEST_STATUSES: readonly ReviewRequestStatus[] = [
  ...NON_TERMINAL_REVIEW_REQUEST_STATUSES,
  'review-received',
  'suppressed',
  'opted-out',
];

export interface ReviewEligibilityEvidence {
  readonly jobCompleted: boolean;
  readonly invoiceNotDisputed: boolean;
  readonly consentGranted: boolean;
  readonly noActiveComplaint: boolean;
}

const REVIEW_REQUEST_TRANSITION_RULES: readonly ReviewRequestTransitionRule[] = [
  { to: 'eligible', from: ['not-eligible'], allowedActors: ['automation'] },
  { to: 'queued', from: ['eligible'], allowedActors: ['automation'] },
  { to: 'sent', from: ['queued'], allowedActors: ['automation'] },
  { to: 'delivered', from: ['sent'], allowedActors: ['automation'] },
  { to: 'failed', from: ['sent', 'queued'], allowedActors: ['automation'] },
  { to: 'suppressed', from: ['not-eligible', 'eligible', 'queued'], allowedActors: ['automation'] },
  {
    to: 'opted-out',
    from: ALL_REVIEW_REQUEST_STATUSES,
    allowedActors: ['customer', 'office-manager'],
  },
  { to: 'review-received', from: ['sent', 'delivered'], allowedActors: ['automation'] },
];

function findRules(
  from: ReviewRequestStatus,
  to: ReviewRequestStatus,
): readonly ReviewRequestTransitionRule[] {
  return REVIEW_REQUEST_TRANSITION_RULES.filter(
    (rule) => rule.to === to && rule.from.includes(from),
  );
}

export interface ReviewRequestTransitionOptions {
  /** Required only for not-eligible -> eligible. */
  readonly eligibilityEvidence?: ReviewEligibilityEvidence;
}

export function transitionReviewRequest(
  reviewRequest: ReviewRequest,
  requestedStatus: ReviewRequestStatus,
  context: TransitionContext,
  options: ReviewRequestTransitionOptions = {},
): TransitionResult<ReviewRequestStatus, ReviewRequest> {
  const currentStatus = reviewRequest.status;
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

  if (currentStatus === 'not-eligible' && requestedStatus === 'eligible') {
    const evidence = options.eligibilityEvidence;
    if (
      !evidence ||
      !evidence.jobCompleted ||
      !evidence.invoiceNotDisputed ||
      !evidence.consentGranted ||
      !evidence.noActiveComplaint
    ) {
      return {
        outcome: 'rejected',
        currentState: currentStatus,
        requestedState: requestedStatus,
        errorCode: 'missing-precondition',
        reason: 'Review-request eligibility evidence is missing or incomplete.',
        missingPreconditions: ['eligibilityEvidence'],
      };
    }
  }

  const nextReviewRequest: ReviewRequest = { ...reviewRequest, status: requestedStatus };

  return {
    outcome: 'success',
    previousState: currentStatus,
    nextState: requestedStatus,
    entity: nextReviewRequest,
    auditRecord: {
      entityType: 'ReviewRequest',
      entityId: reviewRequest.id,
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
