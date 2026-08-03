import type { CompanyId, ContactId } from '../ids';

/**
 * An organization a Contact may belong to (a commercial/HOA/property-
 * management client, as opposed to an individual residential Contact).
 * No state machine - a Company has no lifecycle of its own, same
 * treatment as Contact/Customer (see types/contact.ts).
 */
export interface Company {
  readonly id: CompanyId;
  readonly name: string;
  readonly primaryContactId?: ContactId;
  readonly createdAt: string;
}
