import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateEstimateTotals } from '../src/estimate-totals';
import { createCurrencyCode, createMoney } from '../src/money';

const USD = createCurrencyCode('USD');

test('with no tax, discount, or deposit, total equals subtotal', () => {
  const totals = calculateEstimateTotals({ subtotal: createMoney(50000, USD) });

  assert.equal(totals.subtotal.amountMinorUnits, 50000);
  assert.equal(totals.discountAmount.amountMinorUnits, 0);
  assert.equal(totals.afterDiscount.amountMinorUnits, 50000);
  assert.equal(totals.taxAmount.amountMinorUnits, 0);
  assert.equal(totals.total.amountMinorUnits, 50000);
  assert.equal(totals.depositAmount, undefined);
});

test('applies a fixed discount before computing tax', () => {
  const totals = calculateEstimateTotals({
    subtotal: createMoney(50000, USD),
    discountAmount: createMoney(5000, USD),
    taxRateBasisPoints: 1000, // 10%
  });

  assert.equal(totals.afterDiscount.amountMinorUnits, 45000);
  assert.equal(totals.taxAmount.amountMinorUnits, 4500);
  assert.equal(totals.total.amountMinorUnits, 49500);
});

test('a discount larger than the subtotal floors afterDiscount at zero, never negative', () => {
  const totals = calculateEstimateTotals({
    subtotal: createMoney(10000, USD),
    discountAmount: createMoney(50000, USD),
  });

  assert.equal(totals.afterDiscount.amountMinorUnits, 0);
  assert.equal(totals.total.amountMinorUnits, 0);
});

test('computes an 8.25% tax rate using integer-only arithmetic, rounded', () => {
  const totals = calculateEstimateTotals({
    subtotal: createMoney(10000, USD),
    taxRateBasisPoints: 825,
  });

  // 10000 * 825 / 10000 = 825 exactly - no rounding needed here.
  assert.equal(totals.taxAmount.amountMinorUnits, 825);
  assert.equal(totals.total.amountMinorUnits, 10825);
});

test('deposit is tracked separately and never subtracted from total', () => {
  const totals = calculateEstimateTotals({
    subtotal: createMoney(50000, USD),
    depositAmount: createMoney(10000, USD),
  });

  assert.equal(totals.total.amountMinorUnits, 50000);
  assert.equal(totals.depositAmount?.amountMinorUnits, 10000);
});

test('every returned Money uses the subtotal currency', () => {
  const totals = calculateEstimateTotals({
    subtotal: createMoney(50000, USD),
    discountAmount: createMoney(1000, USD),
    taxRateBasisPoints: 500,
  });

  assert.equal(totals.discountAmount.currency, 'USD');
  assert.equal(totals.afterDiscount.currency, 'USD');
  assert.equal(totals.taxAmount.currency, 'USD');
  assert.equal(totals.total.currency, 'USD');
});
