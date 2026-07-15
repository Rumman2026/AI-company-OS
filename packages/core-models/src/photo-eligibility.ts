/**
 * Photo-publication eligibility only - no storage, upload, image
 * conversion, EXIF parsing, GPS removal, face/plate detection, or CDN
 * behavior is implemented here. This package never claims metadata was
 * physically stripped; it only refuses to consider a photo publishable
 * unless the caller-supplied PhotoAsset record already asserts it was.
 */

import type { PhotoAsset } from './types/photo';

export interface PhotoPublicationEligibility {
  readonly publishable: boolean;
  readonly missingRequirements: readonly string[];
}

export function evaluatePhotoPublicationEligibility(
  photo: PhotoAsset,
): PhotoPublicationEligibility {
  const missing: string[] = [];

  // A private original is never itself a publishable asset.
  if (!photo.publicDerivativeRef) {
    missing.push('publicDerivativeRef');
  }
  if (!photo.metadataStripped) {
    missing.push('metadataStripped');
  }
  if (!photo.gpsDataRemoved) {
    missing.push('gpsDataRemoved');
  }
  if (!photo.privacyReviewPassed) {
    missing.push('privacyReviewPassed');
  }
  if (photo.faceReviewPassed === false) {
    missing.push('faceReviewPassed');
  }
  if (photo.licensePlateReviewPassed === false) {
    missing.push('licensePlateReviewPassed');
  }
  if (!photo.humanPublicationApproved) {
    missing.push('humanPublicationApproved');
  }
  if (!photo.publicationConsentGranted) {
    missing.push('publicationConsentGranted');
  }

  return {
    publishable: missing.length === 0,
    missingRequirements: missing,
  };
}
