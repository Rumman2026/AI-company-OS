/**
 * Parses a user-entered dollar amount (e.g. "450" or "450.50") into
 * integer minor units (cents) for core-models' floating-point-free
 * Money type. Rejects anything that isn't a plain, non-negative decimal
 * with at most 2 fraction digits - never silently rounds a mistyped
 * value.
 */
export function parseDollarsToMinorUnits(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) return null;

  const [wholePart, fractionPart = ''] = trimmed.split('.');
  const cents = fractionPart.padEnd(2, '0');
  const minorUnits = Number(wholePart) * 100 + Number(cents);

  if (!Number.isInteger(minorUnits) || minorUnits < 0) return null;
  return minorUnits;
}

export function formatMinorUnitsAsDollars(minorUnits: number, currency: string): string {
  const dollars = (minorUnits / 100).toFixed(2);
  return currency === 'USD' ? `$${dollars}` : `${dollars} ${currency}`;
}
