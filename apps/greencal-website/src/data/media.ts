import type { MediaRecord } from '../types/content';

/**
 * Typed model for GreenCal's future media library (hero, service,
 * before/after, and project photography/video - prepared for roughly
 * 300-500 future items, per the visual-refinement plan).
 *
 * Real Photo Integration Pass (2026-07-26): the first 6 real, owner-
 * supplied residential photos (3 before/after pairs: roof washing,
 * house washing, concrete/driveway cleaning) are recorded below - see
 * docs/GREENCAL_OWNER_VERIFICATION_REQUIRED.md for the privacy-blur
 * note on the concrete and house-wash pairs. `fullSrc` points at the
 * generated WebP derivative (public/assets/greencal/generated/homepage/),
 * never the original source file - the originals are preserved
 * untouched at public/assets/greencal/homepage/ and are not served
 * directly by any component. No city, customer name, or technical
 * treatment claim is attached to any entry - none were verified.
 *
 * Commercial and Multi-Family/HOA media remain empty: no real
 * commercial/HOA project photo exists, and residential photos must
 * never be presented as commercial/HOA proof (see
 * CommercialPropertyCard.astro / HOAServiceCard.astro, which render the
 * honest "Commercial Project Media Coming Soon" placeholder instead).
 */
export const mediaLibrary: MediaRecord[] = [
  {
    mediaId: 'roof-wash-01-before',
    title: 'Roof Washing - Before',
    altText: 'Concrete tile roof before cleaning, covered in dark algae and lichen buildup',
    serviceCategory: 'residential',
    beforeAfterStatus: 'before',
    mediaType: 'image',
    thumbnailSrc: '/assets/greencal/generated/homepage/roof-wash-01-before.webp',
    fullSrc: '/assets/greencal/generated/homepage/roof-wash-01-before.webp',
    width: 1024,
    height: 1024,
    projectId: 'roof-wash-01',
    featured: true,
    displayOrder: 1,
    approvalStatus: 'approved',
  },
  {
    mediaId: 'roof-wash-01-after',
    title: 'Roof Washing - After',
    altText: 'Concrete tile roof after cleaning, restored to its natural terracotta color',
    serviceCategory: 'residential',
    beforeAfterStatus: 'after',
    mediaType: 'image',
    thumbnailSrc: '/assets/greencal/generated/homepage/roof-wash-01-after.webp',
    fullSrc: '/assets/greencal/generated/homepage/roof-wash-01-after.webp',
    width: 1024,
    height: 1024,
    projectId: 'roof-wash-01',
    featured: true,
    displayOrder: 2,
    approvalStatus: 'approved',
  },
  {
    mediaId: 'house-wash-01-before',
    title: 'House Washing - Before',
    altText: 'Two-story stucco home exterior before washing, showing dark mold and mildew staining',
    serviceCategory: 'residential',
    beforeAfterStatus: 'before',
    mediaType: 'image',
    thumbnailSrc: '/assets/greencal/generated/homepage/house-wash-01-before.webp',
    fullSrc: '/assets/greencal/generated/homepage/house-wash-01-before.webp',
    width: 992,
    height: 1079,
    projectId: 'house-wash-01',
    featured: true,
    displayOrder: 3,
    approvalStatus: 'approved',
  },
  {
    mediaId: 'house-wash-01-after',
    title: 'House Washing - After',
    altText: 'Two-story stucco home exterior after washing, restored to a clean white finish',
    serviceCategory: 'residential',
    beforeAfterStatus: 'after',
    mediaType: 'image',
    thumbnailSrc: '/assets/greencal/generated/homepage/house-wash-01-after.webp',
    fullSrc: '/assets/greencal/generated/homepage/house-wash-01-after.webp',
    width: 992,
    height: 1079,
    projectId: 'house-wash-01',
    featured: true,
    displayOrder: 4,
    approvalStatus: 'approved',
  },
  {
    mediaId: 'concrete-cleaning-01-before',
    title: 'Concrete/Driveway Cleaning - Before',
    altText: 'Residential driveway before cleaning, showing dark oil and organic staining',
    serviceCategory: 'residential',
    beforeAfterStatus: 'before',
    mediaType: 'image',
    thumbnailSrc: '/assets/greencal/generated/homepage/concrete-cleaning-01-before.webp',
    fullSrc: '/assets/greencal/generated/homepage/concrete-cleaning-01-before.webp',
    width: 1408,
    height: 768,
    projectId: 'concrete-cleaning-01',
    featured: true,
    displayOrder: 5,
    approvalStatus: 'approved',
  },
  {
    mediaId: 'concrete-cleaning-01-after',
    title: 'Concrete/Driveway Cleaning - After',
    altText: 'Residential driveway after cleaning, restored to a clean, uniform concrete finish',
    serviceCategory: 'residential',
    beforeAfterStatus: 'after',
    mediaType: 'image',
    thumbnailSrc: '/assets/greencal/generated/homepage/concrete-cleaning-01-after.webp',
    fullSrc: '/assets/greencal/generated/homepage/concrete-cleaning-01-after.webp',
    width: 1408,
    height: 768,
    projectId: 'concrete-cleaning-01',
    featured: true,
    displayOrder: 6,
    approvalStatus: 'approved',
  },
];

export function featuredMedia(category?: MediaRecord['serviceCategory']): MediaRecord[] {
  return mediaLibrary
    .filter((item) => item.approvalStatus === 'approved' && item.featured)
    .filter((item) => !category || item.serviceCategory === category)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}

/** Look up a single media item by its stable mediaId - the primary way components should reference a specific known photo (rather than filtering/sorting `featuredMedia()`). */
export function getMediaById(mediaId: string): MediaRecord | undefined {
  return mediaLibrary.find((item) => item.mediaId === mediaId);
}
