import { createContactId, type Contact, type ContactId } from '@ai-company-os/core-models';
import type { MinimalSupabaseClient } from './supabase-client';

export interface FindOrCreateContactInput {
  readonly businessId: string;
  readonly displayName: string;
  readonly phone?: string;
  readonly email?: string;
}

export type FindOrCreateContactResult =
  { ok: true; contact: Contact; created: boolean } | { ok: false; error: string };

export type GetContactResult = { ok: true; contact: Contact } | { ok: false; error: string };
export type ListContactsResult = { ok: true; contacts: Contact[] } | { ok: false; error: string };

export interface ListContactsOptions {
  readonly search?: string;
  readonly limit?: number;
  readonly offset?: number;
}

export interface ContactRepository {
  /**
   * Looks up an existing contact by phone or email (whichever is
   * provided) before inserting a new one - see
   * migrations/001-crm-foundation.sql for why this is an
   * application-layer dedup, not a database unique constraint.
   */
  findOrCreateContact(input: FindOrCreateContactInput): Promise<FindOrCreateContactResult>;
  /** A single Contact, scoped to `businessId`. */
  getContact(businessId: string, contactId: string): Promise<GetContactResult>;
  /** Every Contact for `businessId`, optionally filtered by a display-name substring search. */
  listContacts(businessId: string, options?: ListContactsOptions): Promise<ListContactsResult>;
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
        // Scoped to this business - a phone/email match belonging to a
        // different tenant must never be returned (see DECISIONS.md
        // ADR-0010). RLS enforces this too for an authenticated caller,
        // but the service-role path (GreenCal's intake wiring) bypasses
        // RLS, so this filter is the only thing preventing a cross-tenant
        // leak there.
        const { data: existing, error: findError } = await client
          .from('contacts')
          .select('id, display_name, phone, email, created_at')
          .eq('business_id', input.businessId)
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
          business_id: input.businessId,
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

    async getContact(businessId, contactId) {
      const { data, error } = await client
        .from('contacts')
        .select('id, display_name, phone, email, created_at')
        .eq('id', contactId)
        .eq('business_id', businessId)
        .single();

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'contact_not_found' };
      }
      return { ok: true, contact: toContact(data as ContactRow) };
    },

    async listContacts(businessId, options = {}) {
      let query = client
        .from('contacts')
        .select('id, display_name, phone, email, created_at')
        .eq('business_id', businessId)
        .order('display_name', { ascending: true });

      if (options.search) query = query.ilike('display_name', `%${options.search}%`);
      if (typeof options.limit === 'number') {
        const from = options.offset ?? 0;
        query = query.range(from, from + options.limit - 1);
      }

      const { data, error } = await query;

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'contact_list_failed' };
      }
      return { ok: true, contacts: (data as ContactRow[]).map(toContact) };
    },
  };
}

export type { ContactId };
