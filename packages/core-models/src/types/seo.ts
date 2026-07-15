import type { InternalLinkRecommendationId, PageMetadataId } from '../ids';

/**
 * SEO metadata for one publishable page (a PublishedProject or a
 * CityService). Canonical/production-domain fields are intentionally
 * optional and unset by default - no production structured data or
 * canonical URL should be assumed until a domain is approved.
 */
export interface PageMetadata {
  readonly id: PageMetadataId;
  readonly title: string;
  readonly description: string;
  readonly canonicalPath?: string;
  readonly robotsDirective?: 'index' | 'noindex';
  readonly sitemapEligible: boolean;
  readonly updatedAt: string;
}

export interface InternalLinkRecommendation {
  readonly id: InternalLinkRecommendationId;
  readonly fromPageId: PageMetadataId;
  readonly toPageId: PageMetadataId;
  readonly anchorTextSuggestion: string;
  readonly reason: string;
  readonly humanApproved: boolean;
}
