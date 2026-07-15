/**
 * Shared actor, context, and result contracts used by every state machine in
 * state-machines/**. Kept in one module so all five machines share exactly
 * one ActorCategory union rather than each inventing its own.
 */

import type { CorrelationId } from './ids';

/**
 * Every actor category referenced anywhere across the five state machines.
 * Do not widen this union per-machine - a machine that doesn't need a given
 * category simply never lists it in an individual transition rule's
 * `allowedActors`.
 */
export type ActorCategory =
  | 'owner-admin'
  | 'office-manager'
  | 'dispatcher'
  | 'technician'
  | 'marketing-editor'
  | 'content-reviewer'
  | 'customer'
  | 'automation'
  | 'ai-drafting-service'
  | 'scheduled-publishing-service';

/**
 * Explicit, caller-supplied context for every transition. Nothing here is
 * ever read from a global, a clock, or a random-value source - determinism
 * depends entirely on what the caller passes in.
 */
export interface TransitionContext {
  readonly actorCategory: ActorCategory;
  readonly actorId: string;
  readonly occurredAt: string;
  readonly reason?: string;
  readonly correlationId?: CorrelationId;
}

export type TransitionErrorCode =
  'illegal-transition' | 'unauthorized-actor' | 'missing-precondition' | 'invalid-evidence';

/**
 * The typed information a future adapter would need to create a real
 * AuditLog row. Deliberately references state names / entity ids rather
 * than full entity snapshots.
 */
export interface ProposedAuditRecord {
  readonly entityType: string;
  readonly entityId: string;
  readonly action: string;
  readonly previousValue: string;
  readonly newValue: string;
  readonly actorCategory: ActorCategory;
  readonly actorId: string;
  readonly automated: boolean;
  readonly occurredAt: string;
  readonly reason?: string;
  readonly correlationId?: CorrelationId;
}

export interface TransitionSuccess<State, Entity> {
  readonly outcome: 'success';
  readonly previousState: State;
  readonly nextState: State;
  readonly entity: Entity;
  readonly auditRecord: ProposedAuditRecord;
}

export interface TransitionRejection<State> {
  readonly outcome: 'rejected';
  readonly currentState: State;
  readonly requestedState: State;
  readonly errorCode: TransitionErrorCode;
  readonly reason: string;
  readonly missingPreconditions?: readonly string[];
  readonly unauthorizedActorCategory?: ActorCategory;
}

export type TransitionResult<State, Entity> =
  TransitionSuccess<State, Entity> | TransitionRejection<State>;

const AUTOMATED_ACTOR_CATEGORIES: ReadonlySet<ActorCategory> = new Set([
  'automation',
  'ai-drafting-service',
  'scheduled-publishing-service',
]);

export function isAutomatedActor(actorCategory: ActorCategory): boolean {
  return AUTOMATED_ACTOR_CATEGORIES.has(actorCategory);
}
