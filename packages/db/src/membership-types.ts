import type { ActorCategory } from '@ai-company-os/core-models';

/**
 * The human, platform-membership-holding subset of core-models'
 * ActorCategory - deliberately excludes 'customer', 'automation',
 * 'ai-drafting-service', and 'scheduled-publishing-service', none of
 * which correspond to a real logged-in admin-console user. Every
 * MembershipRole value is a valid ActorCategory, so a membership row
 * maps directly to a TransitionContext's actorCategory with no
 * translation table - see migrations/002-multi-tenant-foundation.sql's
 * `memberships_role_check` constraint, which must be kept in sync with
 * this list.
 */
export type MembershipRole = 'owner-admin' | 'office-manager' | 'dispatcher' | 'technician';

const _membershipRoleIsActorCategory: MembershipRole extends ActorCategory ? true : never = true;
void _membershipRoleIsActorCategory;
