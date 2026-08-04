import type { EstimateId, EstimateLineItemId, ServicePackageId } from '../ids';
import type { Money } from '../money';

/**
 * A single priced line on an Estimate - see DECISIONS.md ADR-0026. No
 * state machine (matches Company/Note/Task's precedent) - a line item
 * has no lifecycle of its own; it is only ever added, edited, or
 * removed while its parent Estimate is `draft` (packages/db enforces
 * this, mirroring the existing "no update once approved" rule for
 * Estimate itself - see ADR-0021). `lineTotal` is a stored snapshot
 * (`quantity * unitPrice`, computed at write time), not a derived
 * value recomputed on every read - if a linked ServicePackage's price
 * changes later, an already-created line item must not silently change
 * with it, matching how a real invoice/estimate line freezes its price
 * at the time it was written.
 */
export interface EstimateLineItem {
  readonly id: EstimateLineItemId;
  readonly estimateId: EstimateId;
  readonly description: string;
  readonly quantity: number;
  readonly unitPrice: Money;
  readonly lineTotal: Money;
  /** The catalog entry this line was created from, if any - see types/service-package.ts. */
  readonly servicePackageId?: ServicePackageId;
  readonly sortOrder: number;
  readonly createdAt: string;
}
