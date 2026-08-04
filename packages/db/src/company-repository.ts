import { createCompanyId, type Company, type ContactId } from '@ai-company-os/core-models';
import type { MinimalSupabaseClient } from './supabase-client';

/** See DECISIONS.md ADR-0023 - archived_at is a packages/db-layer concern, not a core-models one. */
export interface ArchivableCompany extends Company {
  readonly archivedAt?: string;
}

export interface CreateCompanyInput {
  readonly businessId: string;
  readonly name: string;
  readonly primaryContactId?: string;
}

export type CreateCompanyResult =
  { ok: true; company: ArchivableCompany } | { ok: false; error: string };
export type GetCompanyResult =
  { ok: true; company: ArchivableCompany } | { ok: false; error: string };
export type ListCompaniesResult =
  { ok: true; companies: ArchivableCompany[] } | { ok: false; error: string };
export type ArchiveCompanyResult = { ok: true } | { ok: false; error: string };
export type RestoreCompanyResult = { ok: true } | { ok: false; error: string };

export interface ListCompaniesOptions {
  readonly search?: string;
  /** Excluded from the default list unless true - see DECISIONS.md ADR-0023. */
  readonly includeArchived?: boolean;
}

export interface CompanyRepository {
  createCompany(input: CreateCompanyInput): Promise<CreateCompanyResult>;
  getCompany(businessId: string, companyId: string): Promise<GetCompanyResult>;
  /** Every non-archived Company for `businessId` by default. */
  listCompanies(businessId: string, options?: ListCompaniesOptions): Promise<ListCompaniesResult>;
  archiveCompany(businessId: string, companyId: string): Promise<ArchiveCompanyResult>;
  restoreCompany(businessId: string, companyId: string): Promise<RestoreCompanyResult>;
}

interface CompanyRow {
  id: string;
  name: string;
  primary_contact_id: string | null;
  archived_at: string | null;
  created_at: string;
}

function toCompany(row: CompanyRow): ArchivableCompany {
  return {
    id: createCompanyId(row.id),
    name: row.name,
    primaryContactId: row.primary_contact_id ? (row.primary_contact_id as ContactId) : undefined,
    archivedAt: row.archived_at ?? undefined,
    createdAt: row.created_at,
  };
}

const SELECT_COLUMNS = 'id, name, primary_contact_id, archived_at, created_at';

export function createSupabaseCompanyRepository(client: MinimalSupabaseClient): CompanyRepository {
  return {
    async createCompany(input) {
      const { data, error } = await client
        .from('companies')
        .insert({
          business_id: input.businessId,
          name: input.name,
          primary_contact_id: input.primaryContactId ?? null,
        })
        .select(SELECT_COLUMNS)
        .single();

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'company_insert_failed' };
      }
      return { ok: true, company: toCompany(data as CompanyRow) };
    },

    async getCompany(businessId, companyId) {
      const { data, error } = await client
        .from('companies')
        .select(SELECT_COLUMNS)
        .eq('id', companyId)
        .eq('business_id', businessId)
        .single();

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'company_not_found' };
      }
      return { ok: true, company: toCompany(data as CompanyRow) };
    },

    async listCompanies(businessId, options = {}) {
      let query = client
        .from('companies')
        .select(SELECT_COLUMNS)
        .eq('business_id', businessId)
        .order('name', { ascending: true });

      if (options.search) query = query.ilike('name', `%${options.search}%`);
      if (!options.includeArchived) query = query.is('archived_at', null);

      const { data, error } = await query;

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'company_list_failed' };
      }
      return { ok: true, companies: (data as CompanyRow[]).map(toCompany) };
    },

    async archiveCompany(businessId, companyId) {
      const { error } = await client
        .from('companies')
        .update({ archived_at: new Date().toISOString() })
        .eq('id', companyId)
        .eq('business_id', businessId);

      if (error) {
        return { ok: false, error: error.message ?? 'company_archive_failed' };
      }
      return { ok: true };
    },

    async restoreCompany(businessId, companyId) {
      const { error } = await client
        .from('companies')
        .update({ archived_at: null })
        .eq('id', companyId)
        .eq('business_id', businessId);

      if (error) {
        return { ok: false, error: error.message ?? 'company_restore_failed' };
      }
      return { ok: true };
    },
  };
}
