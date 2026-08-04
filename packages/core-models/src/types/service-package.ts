import type { ServicePackageId } from '../ids';
import type { Money } from '../money';

/**
 * A reusable, tenant-defined service catalog entry (e.g. "Roof soft
 * wash", a fixed price GreenCal offers repeatedly) - see DECISIONS.md
 * ADR-0026. No state machine - `active` is a plain boolean, the same
 * treatment as Company/Task's completion flag, since there is no
 * authorization rule or precondition evidence governing whether a
 * package is offered.
 */
export interface ServicePackage {
  readonly id: ServicePackageId;
  readonly name: string;
  readonly description?: string;
  readonly defaultUnitPrice: Money;
  readonly active: boolean;
  readonly createdAt: string;
}
