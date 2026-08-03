import { createContactId, type Contact, type ContactId } from '@ai-company-os/core-models';
import type { MinimalSupabaseClient } from './supabase-client';

export interface FindOrCreateContactInput {
  readonly displayName: string;
  readonly phone?: string;
  readonly email?: string;
}

export type FindOrCreateContactResult =
  { ok: true; contact: Contact; created: boolean } | { ok: false; error: string };

export interface ContactRepository {
  /**
   * Looks up an existing contact by phone or email (whichever is
   * provided) before inserting a new one - see
   * migrations/001-crm-foundation.sql for why this is an
   * application-layer dedup, not a database unique constraint.
   */
  findOrCreateContact(input: FindOrCreateContactInput): Promise<FindOrCreateContactResult>;
}

interface ContactRow {
  id: string;
  display_name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
}

function toContact(row: ContactRow): Contact {
  return {
    id: createContactId(row.id),
    displayName: row.display_name,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
  };
}

export function createSupabaseContactRepository(client: MinimalSupabaseClient): ContactRepository {
  return {
    async findOrCreateContact(input) {
      const orFilters: string[] = [];
      if (input.phone) orFilters.push(`phone.eq.${input.phone}`);
      if (input.email) orFilters.push(`email.eq.${input.email}`);

      if (orFilters.length > 0) {
        const { data: existing, error: findError } = await client
          .from('contacts')
          .select('id, display_name, phone, email, created_at')
          .or(orFilters.join(','))
          .limit(1)
          .maybeSingle();

        if (findError) {
          return { ok: false, error: findError.message ?? 'contact_lookup_failed' };
        }
        if (existing) {
          return { ok: true, contact: toContact(existing as ContactRow), created: false };
        }
      }

      const { data: inserted, error: insertError } = await client
        .from('contacts')
        .insert({
          display_name: input.displayName,
          phone: input.phone ?? null,
          email: input.email ?? null,
        })
        .select('id, display_name, phone, email, created_at')
        .single();

      if (insertError || !inserted) {
        return { ok: false, error: insertError?.message ?? 'contact_insert_failed' };
      }

      return { ok: true, contact: toContact(inserted as ContactRow), created: true };
    },
  };
}

export type { ContactId };
