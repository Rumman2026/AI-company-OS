import type { MinimalSupabaseClient } from './supabase-client';

const LOGO_BUCKET = 'business-logos';
const LOGO_SIGNED_URL_TTL_SECONDS = 3600;

/**
 * Deliberately not a `packages/core-models` type: `businesses` has
 * never been part of the provider-neutral CRM domain model - it is the
 * tenant boundary itself (see DECISIONS.md ADR-0010), always referenced
 * by a plain `businessId: string` throughout this package, never a
 * branded id. This mirrors `MembershipRole`, the one other
 * `packages/db`-only (non-core-models) type in this package.
 */
export interface BusinessProfile {
  readonly businessId: string;
  readonly name: string;
  readonly slug: string;
  readonly address?: string;
  readonly city?: string;
  readonly state?: string;
  readonly postalCode?: string;
  readonly phone?: string;
  readonly email?: string;
  readonly website?: string;
  readonly logoStorageRef?: string;
  readonly primaryColor?: string;
  readonly createdAt: string;
}

export interface UpdateBusinessProfileInput {
  readonly name?: string;
  readonly address?: string;
  readonly city?: string;
  readonly state?: string;
  readonly postalCode?: string;
  readonly phone?: string;
  readonly email?: string;
  readonly website?: string;
  readonly primaryColor?: string;
}

export interface UploadBusinessLogoInput {
  readonly businessId: string;
  readonly file: Blob;
  readonly fileName: string;
  readonly contentType?: string;
}

export type GetBusinessProfileResult =
  { ok: true; profile: BusinessProfile } | { ok: false; error: string };
export type UpdateBusinessProfileResult =
  { ok: true; profile: BusinessProfile } | { ok: false; error: string };
export type UploadBusinessLogoResult =
  { ok: true; profile: BusinessProfile } | { ok: false; error: string };

export interface BusinessProfileRepository {
  getBusinessProfile(businessId: string): Promise<GetBusinessProfileResult>;
  updateBusinessProfile(
    businessId: string,
    input: UpdateBusinessProfileInput,
  ): Promise<UpdateBusinessProfileResult>;
  /** Stores the file in the private `business-logos` bucket, then records its path - replaces any prior logo. */
  uploadBusinessLogo(input: UploadBusinessLogoInput): Promise<UploadBusinessLogoResult>;
  /** null when no logo has been uploaded, or the signed-URL request itself failed. */
  getBusinessLogoSignedUrl(businessId: string): Promise<string | null>;
}

interface BusinessRow {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_storage_ref: string | null;
  primary_color: string | null;
  created_at: string;
}

function toBusinessProfile(row: BusinessRow): BusinessProfile {
  return {
    businessId: row.id,
    name: row.name,
    slug: row.slug,
    address: row.address ?? undefined,
    city: row.city ?? undefined,
    state: row.state ?? undefined,
    postalCode: row.postal_code ?? undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    website: row.website ?? undefined,
    logoStorageRef: row.logo_storage_ref ?? undefined,
    primaryColor: row.primary_color ?? undefined,
    createdAt: row.created_at,
  };
}

const SELECT_COLUMNS =
  'id, name, slug, address, city, state, postal_code, phone, email, website, logo_storage_ref, primary_color, created_at';

export function createSupabaseBusinessProfileRepository(
  client: MinimalSupabaseClient,
): BusinessProfileRepository {
  async function fetchProfile(businessId: string): Promise<GetBusinessProfileResult> {
    const { data, error } = await client
      .from('businesses')
      .select(SELECT_COLUMNS)
      .eq('id', businessId)
      .single();

    if (error || !data) {
      return { ok: false, error: error?.message ?? 'business_not_found' };
    }
    return { ok: true, profile: toBusinessProfile(data as BusinessRow) };
  }

  return {
    async getBusinessProfile(businessId) {
      return fetchProfile(businessId);
    },

    async updateBusinessProfile(businessId, input) {
      const updates: Record<string, string | null> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.address !== undefined) updates.address = input.address || null;
      if (input.city !== undefined) updates.city = input.city || null;
      if (input.state !== undefined) updates.state = input.state || null;
      if (input.postalCode !== undefined) updates.postal_code = input.postalCode || null;
      if (input.phone !== undefined) updates.phone = input.phone || null;
      if (input.email !== undefined) updates.email = input.email || null;
      if (input.website !== undefined) updates.website = input.website || null;
      if (input.primaryColor !== undefined) updates.primary_color = input.primaryColor || null;

      const { error: updateError } = await client
        .from('businesses')
        .update(updates)
        .eq('id', businessId);

      if (updateError) {
        return { ok: false, error: updateError.message ?? 'business_update_failed' };
      }

      return fetchProfile(businessId);
    },

    async uploadBusinessLogo(input) {
      const path = `${input.businessId}/${Date.now()}-${input.fileName}`;

      const { error: uploadError } = await client.storage
        .from(LOGO_BUCKET)
        .upload(path, input.file, { contentType: input.contentType });

      if (uploadError) {
        return { ok: false, error: uploadError.message ?? 'business_logo_upload_failed' };
      }

      const { error: updateError } = await client
        .from('businesses')
        .update({ logo_storage_ref: path })
        .eq('id', input.businessId);

      if (updateError) {
        return { ok: false, error: updateError.message ?? 'business_update_failed' };
      }

      return fetchProfile(input.businessId);
    },

    async getBusinessLogoSignedUrl(businessId) {
      const result = await fetchProfile(businessId);
      if (!result.ok || !result.profile.logoStorageRef) return null;

      const { data } = await client.storage
        .from(LOGO_BUCKET)
        .createSignedUrl(result.profile.logoStorageRef, LOGO_SIGNED_URL_TTL_SECONDS);

      return data?.signedUrl ?? null;
    },
  };
}
