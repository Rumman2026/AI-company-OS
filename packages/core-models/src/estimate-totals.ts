/**
 * Pure Estimate total calculation - no persistence, no I/O. See
 * DECISIONS.md ADR-0027. Deposit is tracked separately and never
 * subtracted from `total` - it represents an amount due now, not a
 * reduction of what is ultimately owed.
 */

import { createMoney, type CurrencyCode, type Money } from './money';

export interface CalculateEstimateTotalsInput {
  readonly subtotal: Money;
  /** Basis points (1/100 of a percent) - e.g. 825 = 8.25%. */
  readonly taxRateBasisPoints?: number;
  readonly discountAmount?: Money;
  readonly depositAmount?: Money;
}

export interface EstimateTotals {
  readonly subtotal: Money;
  readonly discountAmount: Money;
  /** Subtotal minus discount, floored at zero - never negative. */
  readonly afterDiscount: Money;
  readonly taxAmount: Money;
  readonly total: Money;
  readonly depositAmount?: Money;
}

function zeroMoney(currency: CurrencyCode): Money {
  return createMoney(0, currency);
}

export function calculateEstimateTotals(input: CalculateEstimateTotalsInput): EstimateTotals {
  const currency = input.subtotal.currency;
  const discountAmount = input.discountAmount ?? zeroMoney(currency);

  const afterDiscountMinorUnits = Math.max(
    0,
    input.subtotal.amountMinorUnits - discountAmount.amountMinorUnits,
  );
  const afterDiscount = createMoney(afterDiscountMinorUnits, currency);

  const taxRateBasisPoints = input.taxRateBasisPoints ?? 0;
  // Integer-only arithmetic (multiply then divide, rounded) - never
  // introduces a floating-point amount, matching money.ts's own
  // "floating-point-free" requirement.
  const taxAmountMinorUnits = Math.round((afterDiscountMinorUnits * taxRateBasisPoints) / 10000);
  const taxAmount = createMoney(taxAmountMinorUnits, currency);

  const total = createMoney(afterDiscountMinorUnits + taxAmountMinorUnits, currency);

  return {
    subtotal: input.subtotal,
    discountAmount,
    afterDiscount,
    taxAmount,
    total,
    depositAmount: input.depositAmount,
  };
}
