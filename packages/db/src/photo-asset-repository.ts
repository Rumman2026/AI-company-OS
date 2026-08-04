import { createPhotoAssetId, type PhotoAsset, type JobId } from '@ai-company-os/core-models';
import type { MinimalSupabaseClient } from './supabase-client';

const BUCKET = 'job-photos';
const SIGNED_URL_TTL_SECONDS = 3600;

export interface UploadPhotoInput {
  readonly businessId: string;
  readonly jobId: string;
  readonly kind: PhotoAsset['kind'];
  readonly file: Blob;
  readonly filename: string;
  readonly contentType?: string;
}

export type UploadPhotoResult = { ok: true; photo: PhotoAsset } | { ok: false; error: string };

export interface PhotoWithSignedUrl {
  readonly photo: PhotoAsset;
  /** null when the signed-URL request itself failed - the photo record is still real and returned. */
  readonly signedUrl: string | null;
}

export type ListPhotosResult =
  { ok: true; photos: PhotoWithSignedUrl[] } | { ok: false; error: string };

export interface PhotoAssetRepository {
  /**
   * Uploads the original file to the private `job-photos` Storage
   * bucket, then inserts the PhotoAsset row referencing it. Every
   * publication-readiness field (metadataStripped, gpsDataRemoved,
   * privacyReviewPassed, humanPublicationApproved,
   * publicationConsentGranted) is stored false - no automated privacy
   * pipeline exists yet, and this repository never claims one ran (see
   * migrations/009-photo-foundation.sql).
   */
  uploadPhoto(input: UploadPhotoInput): Promise<UploadPhotoResult>;
  /** Every PhotoAsset for a Job, each paired with a short-lived signed URL for display. */
  listPhotosForJob(businessId: string, jobId: string): Promise<ListPhotosResult>;
}

interface PhotoAssetRow {
  id: string;
  job_id: string;
  kind: PhotoAsset['kind'];
  private_original_ref: string;
  public_derivative_ref: string | null;
  metadata_stripped: boolean;
  gps_data_removed: boolean;
  privacy_review_passed: boolean;
  face_review_passed: boolean | null;
  license_plate_review_passed: boolean | null;
  human_publication_approved: boolean;
  publication_consent_granted: boolean;
  publication_status: PhotoAsset['publicationStatus'];
  caption: string | null;
  alt_text_draft: string | null;
}

function toPhotoAsset(row: PhotoAssetRow): PhotoAsset {
  return {
    id: createPhotoAssetId(row.id),
    jobId: row.job_id as JobId,
    kind: row.kind,
    privateOriginalRef: row.private_original_ref,
    publicDerivativeRef: row.public_derivative_ref ?? undefined,
    metadataStripped: row.metadata_stripped,
    gpsDataRemoved: row.gps_data_removed,
    privacyReviewPassed: row.privacy_review_passed,
    faceReviewPassed: row.face_review_passed ?? undefined,
    licensePlateReviewPassed: row.license_plate_review_passed ?? undefined,
    humanPublicationApproved: row.human_publication_approved,
    publicationConsentGranted: row.publication_consent_granted,
    publicationStatus: row.publication_status,
    caption: row.caption ?? undefined,
    altTextDraft: row.alt_text_draft ?? undefined,
  };
}

const SELECT_COLUMNS =
  'id, job_id, kind, private_original_ref, public_derivative_ref, metadata_stripped, gps_data_removed, privacy_review_passed, face_review_passed, license_plate_review_passed, human_publication_approved, publication_consent_granted, publication_status, caption, alt_text_draft';

export function createSupabasePhotoAssetRepository(
  client: MinimalSupabaseClient,
): PhotoAssetRepository {
  return {
    async uploadPhoto(input) {
      const path = `${input.businessId}/${input.jobId}/${Date.now()}-${input.filename}`;

      const { error: uploadError } = await client.storage
        .from(BUCKET)
        .upload(path, input.file, { contentType: input.contentType });

      if (uploadError) {
        return { ok: false, error: uploadError.message ?? 'photo_upload_failed' };
      }

      const { data, error } = await client
        .from('photo_assets')
        .insert({
          business_id: input.businessId,
          job_id: input.jobId,
          kind: input.kind,
          private_original_ref: path,
          metadata_stripped: false,
          gps_data_removed: false,
          privacy_review_passed: false,
          human_publication_approved: false,
          publication_consent_granted: false,
          publication_status: 'not-published',
        })
        .select(SELECT_COLUMNS)
        .single();

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'photo_insert_failed' };
      }
      return { ok: true, photo: toPhotoAsset(data as PhotoAssetRow) };
    },

    async listPhotosForJob(businessId, jobId) {
      const { data, error } = await client
        .from('photo_assets')
        .select(SELECT_COLUMNS)
        .eq('business_id', businessId)
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'photo_list_failed' };
      }

      const rows = data as PhotoAssetRow[];
      const photos = await Promise.all(
        rows.map(async (row) => {
          const photo = toPhotoAsset(row);
          const { data: signed } = await client.storage
            .from(BUCKET)
            .createSignedUrl(row.private_original_ref, SIGNED_URL_TTL_SECONDS);
          return { photo, signedUrl: signed?.signedUrl ?? null };
        }),
      );

      return { ok: true, photos };
    },
  };
}
