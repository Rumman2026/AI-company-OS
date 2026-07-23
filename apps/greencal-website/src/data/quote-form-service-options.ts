import type { QuoteFormServiceOption } from '../types/content';

/**
 * The full set of selectable quote-form service options - the single
 * source of truth for the quote form's service allowlist (see
 * src/lib/quote-form/validation.ts). A superset of the real pages in
 * services.ts: some approved multi-family/HOA request types map to a
 * shared page rather than each getting a near-duplicate page (see
 * ADR-0007's "do not create separate near-duplicate pages" guidance).
 *
 * `other-exterior-cleaning-request` is the only option with no backing
 * page and no `category` service group - it exists so a legitimate,
 * in-scope-but-unlisted request is not rejected outright, and is
 * reviewed manually rather than auto-accepted (see the quote-form README
 * for the review note shown next to it in the UI).
 */
export const quoteFormServiceOptions: QuoteFormServiceOption[] = [
  // Residential
  {
    slug: 'roof-cleaning',
    label: 'Roof Cleaning',
    category: 'residential',
    pageRoute: '/services/roof-cleaning',
  },
  {
    slug: 'house-washing',
    label: 'House Washing',
    category: 'residential',
    pageRoute: '/services/house-washing',
  },
  {
    slug: 'concrete-cleaning',
    label: 'Concrete Cleaning',
    category: 'residential',
    pageRoute: '/services/concrete-cleaning',
  },

  // Commercial
  {
    slug: 'building-washing',
    label: 'Building Washing',
    category: 'commercial',
    pageRoute: '/commercial/building-washing',
  },
  {
    slug: 'storefront-cleaning',
    label: 'Storefront Cleaning',
    category: 'commercial',
    pageRoute: '/commercial/storefront-cleaning',
  },
  {
    slug: 'commercial-concrete-cleaning',
    label: 'Commercial Concrete Cleaning',
    category: 'commercial',
    pageRoute: '/commercial/concrete-cleaning',
  },
  {
    slug: 'dumpster-pad-cleaning',
    label: 'Dumpster Pad Cleaning',
    category: 'commercial',
    pageRoute: '/commercial/dumpster-pad-cleaning',
  },
  {
    slug: 'drive-thru-cleaning',
    label: 'Drive-Thru Cleaning',
    category: 'commercial',
    pageRoute: '/commercial/drive-thru-cleaning',
  },
  {
    slug: 'gum-stain-removal',
    label: 'Gum and Stain Removal',
    category: 'commercial',
    pageRoute: '/commercial/gum-stain-removal',
  },
  {
    slug: 'recurring-exterior-cleaning',
    label: 'Recurring Exterior Cleaning',
    category: 'commercial',
    pageRoute: '/commercial/recurring-exterior-cleaning',
  },

  // Multi-family & HOA
  {
    slug: 'apartment-or-condo-exterior-cleaning',
    label: 'Apartment or Condo Exterior Cleaning',
    category: 'multi-family-hoa',
    pageRoute: '/multi-family-hoa/apartment-condo-cleaning',
  },
  {
    slug: 'hoa-exterior-cleaning',
    label: 'HOA Exterior Cleaning',
    category: 'multi-family-hoa',
    pageRoute: '/multi-family-hoa/hoa-pressure-washing',
  },
  {
    slug: 'multi-unit-building-washing',
    label: 'Multi-Unit Building Washing',
    category: 'multi-family-hoa',
    pageRoute: '/multi-family-hoa/apartment-condo-cleaning',
  },
  {
    slug: 'common-area-concrete-cleaning',
    label: 'Common-Area Concrete Cleaning',
    category: 'multi-family-hoa',
    pageRoute: '/multi-family-hoa/hoa-pressure-washing',
  },

  // Other (reviewed manually - see README)
  {
    slug: 'other-exterior-cleaning-request',
    label: 'Other Exterior Cleaning Request',
    category: 'other',
  },
];

export const QUOTE_FORM_SERVICE_SLUGS: readonly string[] = quoteFormServiceOptions.map(
  (option) => option.slug,
);
