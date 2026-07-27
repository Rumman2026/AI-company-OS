import type { MediaRecord } from '../types/content';

/**
 * Typed model for GreenCal's future media library (hero, service,
 * before/after, and project photography/video - prepared for roughly
 * 300-500 future items, per the visual-refinement plan). Zero real
 * media exists in this repository today - every consumer of this file
 * must treat an empty/placeholder result as the normal, honest state,
 * never fall back to a stock photo or fabricate a project. See
 * docs/GREENCAL_OWNER_VERIFICATION_REQUIRED.md's Photography section.
 *
 * Intentionally empty: no fabricated placeholder MediaRecord entries
 * exist here, because a MediaRecord implies a real photo exists at
 * `src`/`thumbnailSrc`, which none do. Components that need a media
 * slot (Hero, service cards, BeforeAfterSlider, FeaturedProjectCard)
 * call `ResponsiveImage`/`ImagePlaceholder` directly with a descriptive
 * label instead of looking one up here until real entries exist.
 */
export const mediaLibrary: MediaRecord[] = [];

export function featuredMedia(category?: MediaRecord['serviceCategory']): MediaRecord[] {
  return mediaLibrary
    .filter((item) => item.approvalStatus === 'approved' && item.featured)
    .filter((item) => !category || item.serviceCategory === category)
    .sort((a, b) => a.displayOrder - b.displayOrder);
}
