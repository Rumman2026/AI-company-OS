/**
 * Provider-neutral, floating-point-free monetary representation. No
 * currency conversion, tax calculation, payment-provider behavior, refund
 * processing, or invoice arithmetic beyond minimal invariant validation is
 * implemented here - all of that is explicitly deferred.
 */

import { type Branded, DomainValidationError } from './primitives';

const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;

export type CurrencyCode = Branded<string, 'CurrencyCode'>;
export function createCurrencyCode(value: string): CurrencyCode {
  if (typeof value !== 'string' || !CURRENCY_CODE_PATTERN.test(value)) {
    throw new DomainValidationError(
      'CurrencyCode',
      value,
      'must be a 3-letter uppercase ISO-4217-style code',
    );
  }
  return value as CurrencyCode;
}

export interface Money {
  readonly amountMinorUnits: number;
  readonly currency: CurrencyCode;
}

export function createMoney(amountMinorUnits: number, currency: CurrencyCode): Money {
  if (!Number.isInteger(amountMinorUnits) || amountMinorUnits < 0) {
    throw new DomainValidationError(
      'Money.amountMinorUnits',
      amountMinorUnits,
      'must be a non-negative integer representing minor currency units',
    );
  }
  return { amountMinorUnits, currency };
}
