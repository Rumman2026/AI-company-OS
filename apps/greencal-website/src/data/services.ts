import type { ServiceRecord } from '../types/content';

/**
 * The canonical, published service pages - see DECISIONS.md ADR-0007 for
 * the approved service scope. Every real page GreenCal publishes is
 * listed here; the quote form's selectable options (a superset, since
 * some multi-family sub-requests map to a shared page rather than each
 * getting a near-duplicate page) live separately in
 * quote-form-service-options.ts.
 *
 * See BUSINESS_FACTS.md for the full list of services outside this app's
 * approved scope - not repeated here (to avoid two copies drifting
 * apart) and enforced by tests/scope-exclusions.spec.ts. Concrete
 * cleaning may include a pool deck as a concrete surface only - it never
 * includes pool water, chemical, or equipment service.
 */
export const services: ServiceRecord[] = [
  // --- Residential ---
  {
    slug: 'roof-cleaning',
    route: '/services/roof-cleaning',
    category: 'residential',
    title: 'Roof Cleaning',
    summary: 'Exterior roof cleaning to address surface dirt, debris, and organic growth.',
    body: [
      'Roof cleaning addresses the buildup of dirt, debris, and organic growth that can accumulate on exterior roofing surfaces over time.',
      'The general goal is to clean visible roofing surfaces as part of routine exterior property maintenance - exterior surface cleaning only.',
    ],
    metaTitle: 'Roof Cleaning | GreenCal Pressure Washing',
    metaDescription:
      'Exterior roof cleaning services from GreenCal Pressure Washing, serving approved communities across San Diego, Orange, and Riverside Counties.',
  },
  {
    slug: 'house-washing',
    route: '/services/house-washing',
    category: 'residential',
    title: 'House Washing',
    summary: 'Exterior house, stucco, and siding cleaning as part of routine property care.',
    body: [
      'House washing addresses dirt and buildup on exterior stucco, siding, and painted surfaces, using surface-appropriate methods that may include low-pressure soft washing.',
      'The general goal is to clean visible exterior wall surfaces as part of routine property maintenance - method and pressure are chosen based on the surface being cleaned.',
    ],
    metaTitle: 'House Washing | GreenCal Pressure Washing',
    metaDescription:
      'Exterior house, stucco, and siding cleaning from GreenCal Pressure Washing, serving approved communities across San Diego, Orange, and Riverside Counties.',
  },
  {
    slug: 'concrete-cleaning',
    route: '/services/concrete-cleaning',
    category: 'residential',
    title: 'Concrete Cleaning',
    summary: 'Exterior concrete cleaning for driveways, walkways, patios, and other hard surfaces.',
    body: [
      'Concrete cleaning addresses dirt, staining, and buildup on driveways, sidewalks, walkways, patios, entry areas, and other appropriate exterior hard surfaces, including brick and stone.',
      'A pool deck may be cleaned as a concrete surface. GreenCal does not offer pool cleaning, pool maintenance, pool water service, pool equipment service, or pool repair.',
    ],
    metaTitle: 'Concrete Cleaning | GreenCal Pressure Washing',
    metaDescription:
      'Residential driveway, walkway, patio, and concrete cleaning from GreenCal Pressure Washing, serving approved communities across San Diego, Orange, and Riverside Counties.',
  },

  // --- Commercial ---
  {
    slug: 'building-washing',
    route: '/commercial/building-washing',
    category: 'commercial',
    title: 'Commercial Building Washing',
    summary: 'Exterior washing for commercial building surfaces.',
    body: [
      'Commercial building washing addresses dirt, grime, and buildup on exterior commercial surfaces using surface-appropriate cleaning methods.',
      'Scheduling is arranged around normal business operating hours as part of the quote process.',
    ],
    metaTitle: 'Commercial Building Washing | GreenCal Pressure Washing',
    metaDescription:
      'Commercial exterior building washing from GreenCal Pressure Washing, serving approved communities across San Diego, Orange, and Riverside Counties.',
  },
  {
    slug: 'storefront-cleaning',
    route: '/commercial/storefront-cleaning',
    category: 'commercial',
    title: 'Storefront Cleaning',
    summary: 'Exterior storefront and entryway cleaning for retail and business frontages.',
    body: [
      'Storefront cleaning addresses the entry areas, walkways, and exterior surfaces customers see first - dirt, gum, staining, and general buildup around a business frontage.',
      'This service is commonly requested alongside commercial concrete cleaning for the surrounding walkway or entrance.',
    ],
    metaTitle: 'Storefront Cleaning | GreenCal Pressure Washing',
    metaDescription:
      'Storefront and business-entrance exterior cleaning from GreenCal Pressure Washing, serving approved communities across San Diego, Orange, and Riverside Counties.',
  },
  {
    slug: 'commercial-concrete-cleaning',
    route: '/commercial/concrete-cleaning',
    category: 'commercial',
    title: 'Commercial Concrete Cleaning',
    summary: 'Exterior concrete cleaning for commercial and business properties.',
    body: [
      'Commercial concrete cleaning addresses sidewalks, walkways, entrances, parking-area flatwork, loading docks, dumpster pads, drive-thru lanes, common-area concrete, and appropriate brick and stone surfaces.',
      'Project scope, surface condition, and access are evaluated as part of the quote process for each property.',
    ],
    metaTitle: 'Commercial Concrete Cleaning | GreenCal Pressure Washing',
    metaDescription:
      'Commercial concrete, sidewalk, and parking-area cleaning from GreenCal Pressure Washing, serving approved communities across San Diego, Orange, and Riverside Counties.',
  },
  {
    slug: 'dumpster-pad-cleaning',
    route: '/commercial/dumpster-pad-cleaning',
    category: 'commercial',
    title: 'Dumpster Pad Cleaning',
    summary: 'Exterior cleaning for dumpster pad areas.',
    body: [
      'Dumpster pad cleaning addresses grime, staining, and buildup on the concrete surface surrounding a commercial dumpster enclosure.',
      'This service is often requested on a recurring basis - see Recurring Exterior Cleaning for scheduled maintenance plans.',
    ],
    metaTitle: 'Dumpster Pad Cleaning | GreenCal Pressure Washing',
    metaDescription:
      'Commercial dumpster pad cleaning from GreenCal Pressure Washing, serving approved communities across San Diego, Orange, and Riverside Counties.',
  },
  {
    slug: 'drive-thru-cleaning',
    route: '/commercial/drive-thru-cleaning',
    category: 'commercial',
    title: 'Drive-Thru Cleaning',
    summary: 'Exterior cleaning for drive-thru lanes and pads.',
    body: [
      'Drive-thru cleaning addresses dirt, grease residue, and buildup on drive-thru lane surfaces and adjacent concrete.',
      'Scheduling is arranged to minimize disruption to drive-thru operations as part of the quote process.',
    ],
    metaTitle: 'Drive-Thru Cleaning | GreenCal Pressure Washing',
    metaDescription:
      'Commercial drive-thru lane cleaning from GreenCal Pressure Washing, serving approved communities across San Diego, Orange, and Riverside Counties.',
  },
  {
    slug: 'gum-stain-removal',
    route: '/commercial/gum-stain-removal',
    category: 'commercial',
    title: 'Gum and Stain Removal',
    summary: 'Stain treatment and reduction for exterior commercial surfaces.',
    body: [
      'Gum and stain removal addresses gum, oil, and other surface staining on commercial walkways, entrances, and concrete areas using surface-appropriate treatment methods.',
      'Results depend on the stain type, age, surface, and any prior treatment - GreenCal evaluates each surface individually as part of the quote process and does not guarantee complete removal of every stain.',
    ],
    metaTitle: 'Gum and Stain Removal | GreenCal Pressure Washing',
    metaDescription:
      'Commercial gum and stain treatment from GreenCal Pressure Washing, serving approved communities across San Diego, Orange, and Riverside Counties.',
  },
  {
    slug: 'recurring-exterior-cleaning',
    route: '/commercial/recurring-exterior-cleaning',
    category: 'commercial',
    title: 'Recurring Exterior Cleaning',
    summary:
      'Scheduled recurring exterior cleaning and maintenance plans for commercial properties.',
    body: [
      'Recurring exterior cleaning sets up a scheduled maintenance plan - weekly, monthly, or another interval - for commercial building exteriors, storefronts, concrete, or dumpster pad areas.',
      'Plan frequency and scope are arranged with each property as part of the quote process.',
    ],
    metaTitle: 'Recurring Exterior Cleaning | GreenCal Pressure Washing',
    metaDescription:
      'Recurring commercial exterior cleaning and maintenance plans from GreenCal Pressure Washing, serving approved communities across San Diego, Orange, and Riverside Counties.',
  },

  // --- Multi-family & HOA ---
  {
    slug: 'apartment-condo-cleaning',
    route: '/multi-family-hoa/apartment-condo-cleaning',
    category: 'multi-family-hoa',
    title: 'Apartment & Condo Exterior Cleaning',
    summary:
      'Exterior building washing and common-area concrete cleaning for apartment and condominium properties.',
    body: [
      'Apartment and condo exterior cleaning addresses building exteriors, walkways, and common-area concrete across multi-unit residential properties, including work coordinated with property managers.',
      'Scope typically covers building washing and shared-area concrete cleaning; unit count, number of buildings, and access are gathered as part of the quote process.',
    ],
    metaTitle: 'Apartment & Condo Exterior Cleaning | GreenCal Pressure Washing',
    metaDescription:
      'Exterior cleaning for apartment and condominium properties from GreenCal Pressure Washing, serving approved communities across San Diego, Orange, and Riverside Counties.',
  },
  {
    slug: 'hoa-pressure-washing',
    route: '/multi-family-hoa/hoa-pressure-washing',
    category: 'multi-family-hoa',
    title: 'HOA Pressure Washing',
    summary: 'Exterior cleaning for HOA-managed community common areas and buildings.',
    body: [
      'HOA pressure washing addresses building exteriors and shared common-area concrete across HOA-managed communities, coordinated with HOA boards and community managers.',
      'A recurring service plan can be arranged for ongoing community maintenance - see the quote form to describe the number of buildings, locations, and desired schedule.',
    ],
    metaTitle: 'HOA Pressure Washing | GreenCal Pressure Washing',
    metaDescription:
      'HOA community exterior cleaning from GreenCal Pressure Washing, serving approved communities across San Diego, Orange, and Riverside Counties.',
  },
];

export function servicesByCategory(category: ServiceRecord['category']): ServiceRecord[] {
  return services.filter((service) => service.category === category);
}
