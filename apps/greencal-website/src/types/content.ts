export interface SiteInfo {
  businessName: string;
  phoneDisplay: string;
  phoneHref: string;
  emailDisplay: string;
  emailHref: string;
  region: string;
}

export interface NavItem {
  label: string;
  href: string;
  children?: NavItem[];
}

export type ServiceCategory = 'residential' | 'commercial' | 'multi-family-hoa';

/** A real, published service page - see src/data/services.ts. */
export interface ServiceRecord {
  slug: string;
  route: string;
  category: ServiceCategory;
  title: string;
  summary: string;
  body: string[];
  metaTitle: string;
  metaDescription: string;
}

/**
 * A selectable quote-form service option. Not 1:1 with ServiceRecord: some
 * approved service requests (e.g. individual multi-family sub-categories)
 * map to a shared page rather than each getting a dedicated near-duplicate
 * page - see src/data/quote-form-service-options.ts.
 */
export interface QuoteFormServiceOption {
  slug: string;
  label: string;
  category: ServiceCategory | 'other';
  /** The ServiceRecord.route this option's content lives on, if any. */
  pageRoute?: string;
}

export type County = 'San Diego County' | 'Orange County' | 'Riverside County';

/**
 * A canonical service-area city/community record - the single source of
 * truth for all city-dependent features (navigation, quote form, page
 * generation, sitemap, structured data, filters, footer, internal links).
 * See src/data/cities.ts.
 */
export interface CityRecord {
  name: string;
  slug: string;
  county: County;
  region: string;
  state: 'CA';
  active: boolean;
  residentialAvailability: boolean;
  commercialAvailability: boolean;
  multiFamilyHoaAvailability: boolean;
  /** Editorial state - independent of `indexable` (see the site's city-page publication policy). */
  publishStatus: 'draft' | 'published';
  /** Whether this city's individual page may appear in the sitemap/be indexed. */
  indexable: boolean;
  priority: number;
  nearbyCities: string[];
  relevantServices: string[];
  projectReferences: string[];
  canonicalPath: string;
  aliases: string[];
  metadataStatus: 'generated' | 'reviewed';
  contentStatus: 'template-only' | 'unique-reviewed';
}

export interface PageMeta {
  title: string;
  description: string;
}
