/**
 * Invoice state machine. Transition graph mirrors the owner-approved
 * resolution exactly:
 *
 *   Draft -> Sent, Draft -> Voided
 *   Sent -> PartiallyPaid, Sent -> Paid, Sent -> Overdue, Sent -> Voided
 *   PartiallyPaid -> Paid, PartiallyPaid -> Overdue, PartiallyPaid -> Refunded
 *   Paid -> Refunded
 *   Overdue -> PartiallyPaid, Overdue -> Paid, Overdue -> Voided (stricter)
 *
 * Explicitly prohibited (absence is intentional, not an oversight):
 *   Overdue -> Refunded, Voided -> Paid, Voided -> Sent, Refunded -> Paid,
 *   Refunded -> Sent, Paid -> Overdue, Paid -> PartiallyPaid, Draft -> Paid,
 *   Draft -> Overdue.
 */

import type { Invoice, InvoiceStatus, PaymentOutcomeEvidence } from '../types/invoice';
import type { ActorCategory, TransitionContext, TransitionResult } from '../transition';
import { isAutomatedActor } from '../transition';

type EvidenceRequirement = 'none' | 'partial-payment' | 'full-payment' | 'no-captured-payment';

interface InvoiceTransitionRule {
  readonly to: InvoiceStatus;
  readonly from: readonly InvoiceStatus[];
  readonly allowedActors: readonly ActorCategory[];
  readonly requiresReason: boolean;
  readonly requiredEvidence: EvidenceRequirement;
}

const INVOICE_TRANSITION_RULES: readonly InvoiceTransitionRule[] = [
  {
    to: 'sent',
    from: ['draft'],
    allowedActors: ['office-manager'],
    requiresReason: false,
    requiredEvidence: 'none',
  },
  {
    to: 'voided',
    from: ['draft', 'sent'],
    allowedActors: ['office-manager', 'owner-admin'],
    requiresReason: true,
    requiredEvidence: 'none',
  },
  {
    to: 'partially-paid',
    from: ['sent'],
    allowedActors: ['office-manager', 'automation'],
    requiresReason: false,
    requiredEvidence: 'partial-payment',
  },
  {
    to: 'paid',
    from: ['sent'],
    allowedActors: ['office-manager', 'automation'],
    requiresReason: false,
    requiredEvidence: 'full-payment',
  },
  {
    to: 'overdue',
    from: ['sent', 'partially-paid'],
    allowedActors: ['automation'],
    requiresReason: false,
    requiredEvidence: 'none',
  },
  {
    to: 'paid',
    from: ['partially-paid'],
    allowedActors: ['office-manager', 'automation'],
    requiresReason: false,
    requiredEvidence: 'full-payment',
  },
  {
    to: 'refunded',
    from: ['partially-paid', 'paid'],
    allowedActors: ['office-manager', 'owner-admin'],
    requiresReason: true,
    requiredEvidence: 'none',
  },
  {
    to: 'partially-paid',
    from: ['overdue'],
    allowedActors: ['office-manager', 'automation'],
    requiresReason: false,
    requiredEvidence: 'partial-payment',
  },
  {
    to: 'paid',
    from: ['overdue'],
    allowedActors: ['office-manager', 'automation'],
    requiresReason: false,
    requiredEvidence: 'full-payment',
  },
  {
    to: 'voided',
    from: ['overdue'],
    allowedActors: ['owner-admin'],
    requiresReason: true,
    requiredEvidence: 'no-captured-payment',
  },
];

function findRules(from: InvoiceStatus, to: InvoiceStatus): readonly InvoiceTransitionRule[] {
  return INVOICE_TRANSITION_RULES.filter((rule) => rule.to === to && rule.from.includes(from));
}

function evidenceMatches(
  requirement: EvidenceRequirement,
  evidence?: PaymentOutcomeEvidence,
): boolean {
  if (requirement === 'none') {
    return true;
  }
  if (!evidence) {
    return false;
  }
  return evidence.outcome === requirement;
}

export function transitionInvoice(
  invoice: Invoice,
  requestedStatus: InvoiceStatus,
  context: TransitionContext,
  evidence?: PaymentOutcomeEvidence,
): TransitionResult<InvoiceStatus, Invoice> {
  const currentStatus = invoice.status;
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

  if (!evidenceMatches(authorizedRule.requiredEvidence, evidence)) {
    return {
      outcome: 'rejected',
      currentState: currentStatus,
      requestedState: requestedStatus,
      errorCode: 'invalid-evidence',
      reason: `"${currentStatus}" -> "${requestedStatus}" requires payment-outcome evidence of type "${authorizedRule.requiredEvidence}".`,
      missingPreconditions: ['paymentOutcomeEvidence'],
    };
  }

  const nextInvoice: Invoice = { ...invoice, status: requestedStatus };

  return {
    outcome: 'success',
    previousState: currentStatus,
    nextState: requestedStatus,
    entity: nextInvoice,
    auditRecord: {
      entityType: 'Invoice',
      entityId: invoice.id,
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
