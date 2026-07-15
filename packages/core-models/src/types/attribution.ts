/**
 * Provider-neutral first-touch / current-touch attribution. Captured once at
 * Lead creation as an immutable first-touch snapshot; current-touch fields
 * may be updated by a future intake adapter prior to Lead creation, but
 * ordinary Lead state transitions never mutate this record - see
 * state-machines/lead.ts.
 */

import type { MarketingCampaignId } from '../ids';

export type AttributionChannel =
  | 'organic'
  | 'paid-search'
  | 'paid-social'
  | 'referral'
  | 'direct'
  | 'ai-search-referral'
  | 'offline';

export interface LeadAttribution {
  readonly firstUtmSource?: string;
  readonly firstUtmMedium?: string;
  readonly firstUtmCampaign?: string;
  readonly firstUtmContent?: string;
  readonly firstUtmTerm?: string;
  readonly firstClickId?: string;
  readonly firstReferrer?: string;
  readonly firstLandingPage?: string;
  readonly firstVisitAt?: string;
  readonly currentUtmSource?: string;
  readonly currentUtmMedium?: string;
  readonly currentUtmCampaign?: string;
  readonly currentLandingPage?: string;
  readonly callSessionReference?: string;
  readonly formSessionReference?: string;
  readonly channel: AttributionChannel;
  readonly campaignId?: MarketingCampaignId;
  readonly adGroupReference?: string;
  readonly keyword?: string;
  readonly offlineSource?: string;
  readonly leadCreatedAt: string;
}

export interface MarketingCampaign {
  readonly id: MarketingCampaignId;
  readonly name: string;
  readonly channel: AttributionChannel;
  readonly active: boolean;
}
