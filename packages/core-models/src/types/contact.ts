import type { ContactId, CustomerId } from '../ids';

export interface Contact {
  readonly id: ContactId;
  readonly displayName: string;
  readonly phone?: string;
  readonly email?: string;
}

/**
 * A Contact who has been, or is being, served. Distinct from Contact so a
 * lead's initial contact record can exist before any commitment to serve
 * them - see the entity-relationship summary in the Growth System Plan.
 */
export interface Customer {
  readonly id: CustomerId;
  readonly contactId: ContactId;
  readonly createdAt: string;
}
