/**
 * Resolves a transition attempt across several candidate actor
 * categories, for a caller (e.g. a membership) that may legitimately
 * hold more than one role at once - see DECISIONS.md ADR-0018.
 *
 * This does not change `TransitionContext`/any state machine's own
 * authorization rules: each candidate is tried, in order, exactly as if
 * it were the caller's only role, using the entity's own
 * `transitionX()` function unchanged. Pure - a "rejected" attempt has no
 * side effect, so trying several candidates in memory before a caller
 * decides whether to persist anything is always safe.
 */

import { DomainValidationError } from './primitives';
import type { ActorCategory, TransitionContext, TransitionResult } from './transition';

export function resolveTransitionAcrossActorCategories<State, Entity>(
  attempt: (context: TransitionContext) => TransitionResult<State, Entity>,
  candidateActorCategories: readonly ActorCategory[],
  contextWithoutActor: Omit<TransitionContext, 'actorCategory'>,
): TransitionResult<State, Entity> {
  if (candidateActorCategories.length === 0) {
    throw new DomainValidationError(
      'candidateActorCategories',
      candidateActorCategories,
      'must contain at least one actor category - a caller with zero roles cannot attempt any transition',
    );
  }

  let bestRejection: Extract<TransitionResult<State, Entity>, { outcome: 'rejected' }> | null =
    null;

  for (const actorCategory of candidateActorCategories) {
    const result = attempt({ ...contextWithoutActor, actorCategory });

    if (result.outcome === 'success') {
      return result;
    }

    // Prefer surfacing a rejection that is not "you're not allowed at
    // all" once some candidate role got further than that - it reveals
    // the real, more specific blocking reason (e.g. a missing
    // precondition) rather than the least informative one.
    if (bestRejection === null || bestRejection.errorCode === 'unauthorized-actor') {
      bestRejection = result;
    }
  }

  // candidateActorCategories is non-empty (checked above), so the loop
  // ran at least once and either returned a success or set bestRejection.
  return bestRejection as TransitionResult<State, Entity>;
}
