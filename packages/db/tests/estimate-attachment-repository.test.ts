import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseEstimateAttachmentRepository } from '../src/estimate-attachment-repository';
import { createFakeSupabaseClient, type FakeTable } from './fake-supabase';

const BUSINESS_A = 'business-a';
const BUSINESS_B = 'business-b';

function setup(seed: Array<Record<string, unknown>> = []) {
  const estimate_attachments: FakeTable = { rows: [...seed], nextId: 1 };
  const client = createFakeSupabaseClient({ estimate_attachments });
  const repo = createSupabaseEstimateAttachmentRepository(client);
  return { repo, estimate_attachments };
}

function fakeFile(): Blob {
  return new Blob(['fake-image-bytes'], { type: 'image/jpeg' });
}

test('uploadAttachment stores the file in Storage and inserts a row scoped to the business', async () => {
  const { repo, estimate_attachments } = setup();

  const result = await repo.uploadAttachment({
    businessId: BUSINESS_A,
    estimateId: 'estimate-1',
    file: fakeFile(),
    fileName: 'driveway-before.jpg',
    contentType: 'image/jpeg',
    caption: 'Customer-submitted reference photo',
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.attachment.estimateId, 'estimate-1');
    assert.equal(result.attachment.fileName, 'driveway-before.jpg');
    assert.equal(result.attachment.caption, 'Customer-submitted reference photo');
  }
  assert.equal(estimate_attachments.rows[0].business_id, BUSINESS_A);
});

test("listAttachments returns only the calling business's attachments for the requested estimate, each with a signed URL", async () => {
  const { repo } = setup([
    {
      id: 'attachment-1',
      business_id: BUSINESS_A,
      estimate_id: 'estimate-2',
      storage_ref: `${BUSINESS_A}/estimate-2/1-other.jpg`,
      file_name: 'other.jpg',
      caption: null,
      uploaded_by: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'attachment-2',
      business_id: BUSINESS_B,
      estimate_id: 'estimate-1',
      storage_ref: `${BUSINESS_B}/estimate-1/1-other-tenant.jpg`,
      file_name: 'other-tenant.jpg',
      caption: null,
      uploaded_by: null,
      created_at: '2026-01-02T00:00:00.000Z',
    },
  ]);

  await repo.uploadAttachment({
    businessId: BUSINESS_A,
    estimateId: 'estimate-1',
    file: fakeFile(),
    fileName: 'driveway.jpg',
  });

  const result = await repo.listAttachments(BUSINESS_A, 'estimate-1');
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(
      result.attachments.length,
      1,
      "must never include another business's or estimate's attachment",
    );
    assert.equal(result.attachments[0].attachment.fileName, 'driveway.jpg');
    assert.ok(result.attachments[0].signedUrl !== null);
  }
});

test('deleteAttachment removes the row for the correct business only', async () => {
  const { repo, estimate_attachments } = setup([
    {
      id: 'attachment-1',
      business_id: BUSINESS_A,
      estimate_id: 'estimate-1',
      storage_ref: `${BUSINESS_A}/estimate-1/1-driveway.jpg`,
      file_name: 'driveway.jpg',
      caption: null,
      uploaded_by: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ]);

  const crossTenant = await repo.deleteAttachment(BUSINESS_B, 'attachment-1');
  assert.equal(crossTenant.ok, true);
  assert.equal(
    estimate_attachments.rows.length,
    1,
    "a cross-tenant delete must not remove another business's row",
  );

  const result = await repo.deleteAttachment(BUSINESS_A, 'attachment-1');
  assert.equal(result.ok, true);
  assert.equal(estimate_attachments.rows.length, 0);
});
