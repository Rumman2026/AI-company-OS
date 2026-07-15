import type { CityId, CityServiceId, ServiceId } from '../ids';

export interface Service {
  readonly id: ServiceId;
  readonly name: string;
  readonly masterPagePath: string;
}

export interface City {
  readonly id: CityId;
  readonly name: string;
  readonly activelyServed: boolean;
}

export type CityServicePublicationStatus = 'not-eligible' | 'eligible' | 'approved' | 'published';

/**
 * An eligibility and publication record for one City x Service pair - never
 * an auto-generated page. City-service pages must supplement, not
 * duplicate, the Service's master page.
 */
export interface CityService {
  readonly id: CityServiceId;
  readonly cityId: CityId;
  readonly serviceId: ServiceId;
  readonly serviceGenuinelyOfferedHere: boolean;
  readonly verifiedJobCount: number;
  readonly hasOriginalLocalPhotos: boolean;
  readonly hasLocalObservations: boolean;
  readonly hasRealCustomerQuestions: boolean;
  readonly uniqueContentReady: boolean;
  readonly humanApproved: boolean;
  readonly indexable: boolean;
  readonly publicationStatus: CityServicePublicationStatus;
}
