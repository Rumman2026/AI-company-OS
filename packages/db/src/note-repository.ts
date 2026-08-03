import { createNoteId, type Note, type NotableEntityType } from '@ai-company-os/core-models';
import type { MinimalSupabaseClient } from './supabase-client';

export interface CreateNoteInput {
  readonly businessId: string;
  readonly entityType: NotableEntityType;
  readonly entityId: string;
  readonly body: string;
  readonly authorId?: string;
}

export interface ListNotesOptions {
  readonly entityType: NotableEntityType;
  readonly entityId: string;
}

export type CreateNoteResult = { ok: true; note: Note } | { ok: false; error: string };
export type ListNotesResult = { ok: true; notes: Note[] } | { ok: false; error: string };

export interface NoteRepository {
  createNote(input: CreateNoteInput): Promise<CreateNoteResult>;
  listNotes(businessId: string, options: ListNotesOptions): Promise<ListNotesResult>;
}

interface NoteRow {
  id: string;
  entity_type: NotableEntityType;
  entity_id: string;
  body: string;
  author_id: string | null;
  created_at: string;
}

function toNote(row: NoteRow): Note {
  return {
    id: createNoteId(row.id),
    entityType: row.entity_type,
    entityId: row.entity_id,
    body: row.body,
    authorId: row.author_id ?? undefined,
    createdAt: row.created_at,
  };
}

const SELECT_COLUMNS = 'id, entity_type, entity_id, body, author_id, created_at';

export function createSupabaseNoteRepository(client: MinimalSupabaseClient): NoteRepository {
  return {
    async createNote(input) {
      const { data, error } = await client
        .from('notes')
        .insert({
          business_id: input.businessId,
          entity_type: input.entityType,
          entity_id: input.entityId,
          body: input.body,
          author_id: input.authorId ?? null,
        })
        .select(SELECT_COLUMNS)
        .single();

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'note_insert_failed' };
      }
      return { ok: true, note: toNote(data as NoteRow) };
    },

    async listNotes(businessId, options) {
      const { data, error } = await client
        .from('notes')
        .select(SELECT_COLUMNS)
        .eq('business_id', businessId)
        .eq('entity_type', options.entityType)
        .eq('entity_id', options.entityId)
        .order('created_at', { ascending: false });

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'note_list_failed' };
      }
      return { ok: true, notes: (data as NoteRow[]).map(toNote) };
    },
  };
}
