/**
 * Branding infrastructure shared by every opaque identifier and safe scalar
 * type in this package. See ids.ts and money.ts for concrete uses.
 */

declare const brandSymbol: unique symbol;

export type Branded<Value, BrandName extends string> = Value & {
  readonly [brandSymbol]: BrandName;
};

export class DomainValidationError extends Error {
  readonly subject: string;
  readonly value: unknown;

  constructor(subject: string, value: unknown, reason: string) {
    super(`Invalid ${subject}: ${reason} (received ${JSON.stringify(value)})`);
    this.name = 'DomainValidationError';
    this.subject = subject;
    this.value = value;
  }
}

/**
 * The single, centralized runtime-validation + brand-assertion boundary used
 * by every branded string type this package defines. Callers can only reach
 * a branded value through a named `createXId`-style constructor that calls
 * this function - the assertion itself is never exposed directly.
 */
export function createBrandedString<BrandName extends string>(
  brandName: BrandName,
  value: string,
): Branded<string, BrandName> {
  if (typeof value !== 'string' || value.trim().length === 0 || value !== value.trim()) {
    throw new DomainValidationError(
      brandName,
      value,
      'must be a non-empty string with no leading or trailing whitespace',
    );
  }
  return value as Branded<string, BrandName>;
}
