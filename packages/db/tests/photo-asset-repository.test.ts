import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSupabasePhotoAssetRepository } from '../src/photo-asset-repository';
import { createFakeSupabaseClient, type FakeTable } from './fake-supabase';

const BUSINESS_A = 'business-a';
const BUSINESS_B = 'business-b';

function setup(seed: Array<Record<string, unknown>> = []) {
  const photo_assets: FakeTable = { rows: [...seed], nextId: 1 };
  const client = createFakeSupabaseClient({ photo_assets });
  const repo = createSupabasePhotoAssetRepository(client);
  return { repo, photo_assets };
}

function fakeFile(): Blob {
  return new Blob(['fake-image-bytes'], { type: 'image/jpeg' });
}

test('uploadPhoto stores the original in Storage and inserts a not-yet-publishable PhotoAsset row', async () => {
  const { repo, photo_assets } = setup();

  const result = await repo.uploadPhoto({
    businessId: BUSINESS_A,
    jobId: 'job-1',
    kind: 'before',
    file: fakeFile(),
    filename: 'front-yard.jpg',
    contentType: 'image/jpeg',
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.photo.kind, 'before');
    assert.equal(result.photo.jobId, 'job-1');
    assert.equal(result.photo.metadataStripped, false);
    assert.equal(result.photo.gpsDataRemoved, false);
    assert.equal(result.photo.privacyReviewPassed, false);
    assert.equal(result.photo.humanPublicationApproved, false);
    assert.equal(result.photo.publicationConsentGranted, false);
    assert.equal(result.photo.publicationStatus, 'not-published');
  }
  assert.equal(photo_assets.rows[0].business_id, BUSINESS_A);
});

test('uploadPhoto accepts the progress kind', async () => {
  const { repo } = setup();

  const result = await repo.uploadPhoto({
    businessId: BUSINESS_A,
    jobId: 'job-1',
    kind: 'progress',
    file: fakeFile(),
    filename: 'midway.jpg',
  });

  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.photo.kind, 'progress');
});

test("listPhotosForJob returns only the calling business's photos for the requested job, each with a signed URL", async () => {
  const { repo } = setup([
    {
      id: 'photo-1',
      business_id: BUSINESS_A,
      job_id: 'job-1',
      kind: 'before',
      private_original_ref: `${BUSINESS_A}/job-1/1-front.jpg`,
      public_derivative_ref: null,
      metadata_stripped: false,
      gps_data_removed: false,
      privacy_review_passed: false,
      face_review_passed: null,
      license_plate_review_passed: null,
      human_publication_approved: false,
      publication_consent_granted: false,
      publication_status: 'not-published',
      caption: null,
      alt_text_draft: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'photo-2',
      business_id: BUSINESS_A,
      job_id: 'job-2',
      kind: 'after',
      private_original_ref: `${BUSINESS_A}/job-2/1-back.jpg`,
      public_derivative_ref: null,
      metadata_stripped: false,
      gps_data_removed: false,
      privacy_review_passed: false,
      face_review_passed: null,
      license_plate_review_passed: null,
      human_publication_approved: false,
      publication_consent_granted: false,
      publication_status: 'not-published',
      caption: null,
      alt_text_draft: null,
      created_at: '2026-01-02T00:00:00.000Z',
    },
    {
      id: 'photo-3',
      business_id: BUSINESS_B,
      job_id: 'job-1',
      kind: 'before',
      private_original_ref: `${BUSINESS_B}/job-1/1-other.jpg`,
      public_derivative_ref: null,
      metadata_stripped: false,
      gps_data_removed: false,
      privacy_review_passed: false,
      face_review_passed: null,
      license_plate_review_passed: null,
      human_publication_approved: false,
      publication_consent_granted: false,
      publication_status: 'not-published',
      caption: null,
      alt_text_draft: null,
      created_at: '2026-01-03T00:00:00.000Z',
    },
  ]);

  // The seeded rows above were never actually uploaded through the fake
  // storage, so their signed-URL requests will honestly come back null -
  // upload one more real photo so at least one row's signedUrl resolves.
  await repo.uploadPhoto({
    businessId: BUSINESS_A,
    jobId: 'job-1',
    kind: 'before',
    file: fakeFile(),
    filename: 'front.jpg',
  });

  const result = await repo.listPhotosForJob(BUSINESS_A, 'job-1');
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.photos.length, 2, "must never include another business's or job's photo");
    assert.ok(result.photos.every((p) => p.photo.jobId === 'job-1'));
    assert.ok(
      result.photos.some((p) => p.signedUrl !== null),
      'the actually-uploaded photo must resolve a real signed URL',
    );
  }
});
