import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseNoteRepository } from '../src/note-repository';
import { createFakeSupabaseClient, type FakeTable } from './fake-supabase';

const BUSINESS_A = 'business-a';
const BUSINESS_B = 'business-b';

function setup(seed: Array<Record<string, unknown>> = []) {
  const notes: FakeTable = { rows: [...seed], nextId: 1 };
  const client = createFakeSupabaseClient({ notes });
  const repo = createSupabaseNoteRepository(client);
  return { repo, notes };
}

test('createNote inserts a new note scoped to the business', async () => {
  const { repo, notes } = setup();

  const result = await repo.createNote({
    businessId: BUSINESS_A,
    entityType: 'lead',
    entityId: 'lead-1',
    body: 'Called, left voicemail',
    authorId: 'user-1',
  });

  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.note.body, 'Called, left voicemail');
  assert.equal(notes.rows[0].business_id, BUSINESS_A);
});

test('createNote does not require an authorId', async () => {
  const { repo } = setup();

  const result = await repo.createNote({
    businessId: BUSINESS_A,
    entityType: 'company',
    entityId: 'company-1',
    body: 'Preferred contact is the property manager',
  });

  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.note.authorId, undefined);
});

test("listNotes returns only the calling business's notes for the requested entity", async () => {
  const { repo } = setup([
    {
      id: 'note-1',
      business_id: BUSINESS_A,
      entity_type: 'lead',
      entity_id: 'lead-1',
      body: 'First note',
      author_id: 'user-1',
      created_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'note-2',
      business_id: BUSINESS_A,
      entity_type: 'lead',
      entity_id: 'lead-2',
      body: 'Different lead, must not appear',
      author_id: 'user-1',
      created_at: '2026-01-02T00:00:00.000Z',
    },
    {
      id: 'note-3',
      business_id: BUSINESS_B,
      entity_type: 'lead',
      entity_id: 'lead-1',
      body: 'Another tenant, must not appear',
      author_id: 'user-2',
      created_at: '2026-01-03T00:00:00.000Z',
    },
  ]);

  const result = await repo.listNotes(BUSINESS_A, { entityType: 'lead', entityId: 'lead-1' });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.notes.length, 1, "must never include another business's or entity's note");
    assert.equal(result.notes[0].id, 'note-1');
  }
});
