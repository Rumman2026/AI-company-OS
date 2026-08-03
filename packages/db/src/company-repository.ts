import { createCompanyId, type Company, type ContactId } from '@ai-company-os/core-models';
import type { MinimalSupabaseClient } from './supabase-client';

export interface CreateCompanyInput {
  readonly businessId: string;
  readonly name: string;
  readonly primaryContactId?: string;
}

export type CreateCompanyResult = { ok: true; company: Company } | { ok: false; error: string };
export type GetCompanyResult = { ok: true; company: Company } | { ok: false; error: string };
export type ListCompaniesResult = { ok: true; companies: Company[] } | { ok: false; error: string };

export interface ListCompaniesOptions {
  readonly search?: string;
}

export interface CompanyRepository {
  createCompany(input: CreateCompanyInput): Promise<CreateCompanyResult>;
  getCompany(businessId: string, companyId: string): Promise<GetCompanyResult>;
  listCompanies(businessId: string, options?: ListCompaniesOptions): Promise<ListCompaniesResult>;
}

interface CompanyRow {
  id: string;
  name: string;
  primary_contact_id: string | null;
  created_at: string;
}

function toCompany(row: CompanyRow): Company {
  return {
    id: createCompanyId(row.id),
    name: row.name,
    primaryContactId: row.primary_contact_id ? (row.primary_contact_id as ContactId) : undefined,
    createdAt: row.created_at,
  };
}

const SELECT_COLUMNS = 'id, name, primary_contact_id, created_at';

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

      const { data, error } = await query;

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'company_list_failed' };
      }
      return { ok: true, companies: (data as CompanyRow[]).map(toCompany) };
    },
  };
}
