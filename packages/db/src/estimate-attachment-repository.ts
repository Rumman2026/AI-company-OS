import {
  createEstimateAttachmentId,
  type EstimateAttachment,
  type EstimateId,
} from '@ai-company-os/core-models';
import type { MinimalSupabaseClient } from './supabase-client';

const BUCKET = 'estimate-attachments';
const SIGNED_URL_TTL_SECONDS = 3600;

export interface UploadEstimateAttachmentInput {
  readonly businessId: string;
  readonly estimateId: string;
  readonly file: Blob;
  readonly fileName: string;
  readonly contentType?: string;
  readonly caption?: string;
  readonly uploadedBy?: string;
}

export type UploadEstimateAttachmentResult =
  { ok: true; attachment: EstimateAttachment } | { ok: false; error: string };

export interface EstimateAttachmentWithSignedUrl {
  readonly attachment: EstimateAttachment;
  /** null when the signed-URL request itself failed - the attachment record is still real and returned. */
  readonly signedUrl: string | null;
}

export type ListEstimateAttachmentsResult =
  { ok: true; attachments: EstimateAttachmentWithSignedUrl[] } | { ok: false; error: string };

export type DeleteEstimateAttachmentResult = { ok: true } | { ok: false; error: string };

export interface EstimateAttachmentRepository {
  /** Uploads the file to the private `estimate-attachments` Storage bucket, then inserts the row referencing it. */
  uploadAttachment(input: UploadEstimateAttachmentInput): Promise<UploadEstimateAttachmentResult>;
  /** Every attachment for an Estimate, each paired with a short-lived signed URL for display. */
  listAttachments(businessId: string, estimateId: string): Promise<ListEstimateAttachmentsResult>;
  deleteAttachment(
    businessId: string,
    attachmentId: string,
  ): Promise<DeleteEstimateAttachmentResult>;
}

interface EstimateAttachmentRow {
  id: string;
  estimate_id: string;
  storage_ref: string;
  file_name: string;
  caption: string | null;
  uploaded_by: string | null;
  created_at: string;
}

function toEstimateAttachment(row: EstimateAttachmentRow): EstimateAttachment {
  return {
    id: createEstimateAttachmentId(row.id),
    estimateId: row.estimate_id as EstimateId,
    storageRef: row.storage_ref,
    fileName: row.file_name,
    caption: row.caption ?? undefined,
    uploadedBy: row.uploaded_by ?? undefined,
    uploadedAt: row.created_at,
  };
}

const SELECT_COLUMNS = 'id, estimate_id, storage_ref, file_name, caption, uploaded_by, created_at';

export function createSupabaseEstimateAttachmentRepository(
  client: MinimalSupabaseClient,
): EstimateAttachmentRepository {
  return {
    async uploadAttachment(input) {
      const path = `${input.businessId}/${input.estimateId}/${Date.now()}-${input.fileName}`;

      const { error: uploadError } = await client.storage
        .from(BUCKET)
        .upload(path, input.file, { contentType: input.contentType });

      if (uploadError) {
        return { ok: false, error: uploadError.message ?? 'estimate_attachment_upload_failed' };
      }

      const { data, error } = await client
        .from('estimate_attachments')
        .insert({
          business_id: input.businessId,
          estimate_id: input.estimateId,
          storage_ref: path,
          file_name: input.fileName,
          caption: input.caption ?? null,
          uploaded_by: input.uploadedBy ?? null,
        })
        .select(SELECT_COLUMNS)
        .single();

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'estimate_attachment_insert_failed' };
      }
      return { ok: true, attachment: toEstimateAttachment(data as EstimateAttachmentRow) };
    },

    async listAttachments(businessId, estimateId) {
      const { data, error } = await client
        .from('estimate_attachments')
        .select(SELECT_COLUMNS)
        .eq('business_id', businessId)
        .eq('estimate_id', estimateId)
        .order('created_at', { ascending: true });

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'estimate_attachment_list_failed' };
      }

      const rows = data as EstimateAttachmentRow[];
      const attachments = await Promise.all(
        rows.map(async (row) => {
          const attachment = toEstimateAttachment(row);
          const { data: signed } = await client.storage
            .from(BUCKET)
            .createSignedUrl(row.storage_ref, SIGNED_URL_TTL_SECONDS);
          return { attachment, signedUrl: signed?.signedUrl ?? null };
        }),
      );

      return { ok: true, attachments };
    },

    async deleteAttachment(businessId, attachmentId) {
      const { error } = await client
        .from('estimate_attachments')
        .delete()
        .eq('id', attachmentId)
        .eq('business_id', businessId);

      if (error) {
        return { ok: false, error: error.message ?? 'estimate_attachment_delete_failed' };
      }
      return { ok: true };
    },
  };
}
