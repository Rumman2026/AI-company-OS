import type { JobId, PhotoAssetId, PhotoPairId } from '../ids';

export type PhotoPublicationStatus = 'not-published' | 'publishable' | 'published' | 'taken-down';

/**
 * A single uploaded photo. `privateOriginal` and `publicDerivative` are
 * modeled as structurally distinct - see photo-eligibility.ts for the
 * publishability invariants that gate ever treating one as the other.
 */
export interface PhotoAsset {
  readonly id: PhotoAssetId;
  readonly jobId: JobId;
  readonly kind: 'before' | 'after';
  readonly privateOriginalRef: string;
  readonly publicDerivativeRef?: string;
  readonly metadataStripped: boolean;
  readonly gpsDataRemoved: boolean;
  readonly privacyReviewPassed: boolean;
  readonly faceReviewPassed?: boolean;
  readonly licensePlateReviewPassed?: boolean;
  readonly humanPublicationApproved: boolean;
  readonly publicationConsentGranted: boolean;
  readonly publicationStatus: PhotoPublicationStatus;
  readonly caption?: string;
  readonly altTextDraft?: string;
}

export interface PhotoPair {
  readonly id: PhotoPairId;
  readonly jobId: JobId;
  readonly beforePhotoId: PhotoAssetId;
  readonly afterPhotoId: PhotoAssetId;
  readonly humanConfirmed: boolean;
}
