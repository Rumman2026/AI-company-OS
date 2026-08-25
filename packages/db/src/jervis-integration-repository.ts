import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * The Jervis integration write/read path - migrations 039 and 040.
 *
 * WHY THIS IS NOT LIKE THE OTHER REPOSITORIES IN THIS PACKAGE. Every other
 * repository here takes a `MinimalSupabaseClient` built by `createDbClient`,
 * which uses the **service-role key** and bypasses RLS entirely (see
 * `supabase-client.ts`). That is correct for trusted server code inside this
 * monorepo.
 *
 * Jervis is not that. It is an external orchestration system, and giving it a
 * service-role key would give it every business and every table unconditionally.
 * So it authenticates as a dedicated Supabase Auth machine identity, executes as
 * the shared `authenticated` role, and reaches the CRM only through the four
 * write and four read functions migrations 039/040 define - each of which calls
 * `jervis_private.jervis_authorize` before doing anything.
 *
 * WHY READS GO THROUGH RPCs TOO. `authenticated` holds no SELECT on `contacts`,
 * `tasks` or `audit_log`, so a direct PostgREST read returns 403. Granting
 * SELECT would widen access for every human CRM user who shares that role, to
 * solve one machine identity's read - see DECISIONS.md ADR-0042.
 *
 * THE CLIENT TYPE IS `.rpc` ONLY, deliberately. This repository cannot reach a
 * table even by mistake, and a test can supply a two-line fake - same reasoning
 * as `MinimalSupabaseClient` narrowing to `.from`.
 */
export type JervisRpcClient = Pick<SupabaseClient, 'rpc'>;

/** Result shapes follow this package's existing convention. */
export type JervisWriteResult = { ok: true; id: string } | { ok: false; error: string };
export type JervisReadResult<T> = { ok: true; record: T | null } | { ok: false; error: string };
export type JervisAuditReadResult =
  { ok: true; events: JervisAuditEvent[] } | { ok: false; error: string };

/**
 * `correlationId` threads one workflow through every record it touches, and
 * `idempotencyKey` prevents a retry performing the operation twice. They are
 * separate fields because they answer different questions, and the RPCs reject
 * a blank correlation rather than letting it degrade into an untraceable write.
 */
export interface JervisWriteContext {
  readonly businessId: string;
  readonly correlationId: string;
  readonly idempotencyKey: string;
}

export interface JervisContact {
  readonly id: string;
  readonly businessId: string;
  readonly displayName: string;
  readonly email?: string;
  readonly phone?: string;
  readonly archivedAt?: string;
  readonly createdAt: string;
}

export interface JervisLead {
  readonly id: string;
  readonly businessId: string;
  readonly contactId: string;
  readonly status: string;
  readonly attribution: unknown;
  readonly duplicateOfLeadId?: string;
  readonly archivedAt?: string;
  readonly createdAt: string;
}

export interface JervisTask {
  readonly id: string;
  readonly businessId: string;
  readonly title: string;
  readonly description?: string;
  readonly dueAt?: string;
  readonly entityType?: string;
  readonly entityId?: string;
  readonly completed: boolean;
  readonly completedAt?: string;
  readonly createdAt: string;
}

export interface JervisAuditEvent {
  readonly id: string;
  readonly businessId: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly action: string;
  readonly previousValue: string;
  readonly newValue: string;
  readonly actorCategory: string;
  readonly actorId?: string;
  readonly automated: boolean;
  readonly occurredAt: string;
  readonly reason?: string;
  readonly correlationId?: string;
}

export interface JervisIntegrationRepository {
  createContact(
    context: JervisWriteContext,
    input: { displayName: string; email?: string; phone?: string },
  ): Promise<JervisWriteResult>;

  createLead(
    context: JervisWriteContext,
    input: { contactId: string; channel?: string },
  ): Promise<JervisWriteResult>;

  createFollowUpTask(
    context: JervisWriteContext,
    input: {
      title: string;
      description?: string;
      dueAt?: string;
      entityType?: 'lead' | 'contact' | 'company' | 'job';
      entityId?: string;
    },
  ): Promise<JervisWriteResult>;

  appendAuditEvent(
    context: JervisWriteContext,
    input: {
      entityType: 'lead' | 'contact' | 'task';
      entityId: string;
      action: string;
      previousValue?: string;
      newValue?: string;
      reason?: string;
    },
  ): Promise<JervisWriteResult>;

  /**
   * `record: null` means **not visible to this caller**. The RPCs return zero
   * rows both for a record that does not exist and for one belonging to another
   * tenant, deliberately: confirming that a record exists but is not yours is
   * itself a cross-tenant disclosure. Callers must not treat null as "try
   * again with different credentials".
   */
  getContact(businessId: string, contactId: string): Promise<JervisReadResult<JervisContact>>;
  getLead(businessId: string, leadId: string): Promise<JervisReadResult<JervisLead>>;
  getTask(businessId: string, taskId: string): Promise<JervisReadResult<JervisTask>>;

  /**
   * Every audit row for ONE workflow, in order. Both arguments are required by
   * the function itself, so this can never become a tenant-wide history dump.
   */
  getAuditEventsByCorrelation(
    businessId: string,
    correlationId: string,
  ): Promise<JervisAuditReadResult>;
}

function firstRow(data: unknown): Record<string, unknown> | null {
  if (Array.isArray(data)) return (data[0] as Record<string, unknown>) ?? null;
  if (data && typeof data === 'object') return data as Record<string, unknown>;
  return null;
}

function optional(value: unknown): string | undefined {
  return value === null || value === undefined ? undefined : String(value);
}

function toContact(row: Record<string, unknown>): JervisContact {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    displayName: String(row.display_name),
    email: optional(row.email),
    phone: optional(row.phone),
    archivedAt: optional(row.archived_at),
    createdAt: String(row.created_at),
  };
}

function toLead(row: Record<string, unknown>): JervisLead {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    contactId: String(row.contact_id),
    status: String(row.status),
    attribution: row.attribution,
    duplicateOfLeadId: optional(row.duplicate_of_lead_id),
    archivedAt: optional(row.archived_at),
    createdAt: String(row.created_at),
  };
}

function toTask(row: Record<string, unknown>): JervisTask {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    title: String(row.title),
    description: optional(row.description),
    dueAt: optional(row.due_at),
    entityType: optional(row.entity_type),
    entityId: optional(row.entity_id),
    completed: Boolean(row.completed),
    completedAt: optional(row.completed_at),
    createdAt: String(row.created_at),
  };
}

function toAuditEvent(row: Record<string, unknown>): JervisAuditEvent {
  return {
    id: String(row.id),
    businessId: String(row.business_id),
    entityType: String(row.entity_type),
    entityId: String(row.entity_id),
    action: String(row.action),
    previousValue: String(row.previous_value ?? ''),
    newValue: String(row.new_value ?? ''),
    actorCategory: String(row.actor_category),
    actorId: optional(row.actor_id),
    automated: Boolean(row.automated),
    occurredAt: String(row.occurred_at),
    reason: optional(row.reason),
    correlationId: optional(row.correlation_id),
  };
}

export function createSupabaseJervisIntegrationRepository(
  client: JervisRpcClient,
): JervisIntegrationRepository {
  async function write(name: string, args: Record<string, unknown>): Promise<JervisWriteResult> {
    const { data, error } = await client.rpc(name, args);
    if (error) return { ok: false, error: error.message };
    if (!data) return { ok: false, error: `${name} returned no id` };
    return { ok: true, id: String(data) };
  }

  async function read<T>(
    name: string,
    args: Record<string, unknown>,
    map: (row: Record<string, unknown>) => T,
  ): Promise<JervisReadResult<T>> {
    const { data, error } = await client.rpc(name, args);
    if (error) return { ok: false, error: error.message };
    const row = firstRow(data);
    return { ok: true, record: row ? map(row) : null };
  }

  return {
    async createContact(context, input) {
      return write('jervis_create_contact', {
        p_business_id: context.businessId,
        p_display_name: input.displayName,
        p_email: input.email ?? null,
        p_phone: input.phone ?? null,
        p_correlation_id: context.correlationId,
        p_idempotency_key: context.idempotencyKey,
      });
    },

    async createLead(context, input) {
      return write('jervis_create_lead', {
        p_business_id: context.businessId,
        p_contact_id: input.contactId,
        p_channel: input.channel ?? null,
        p_correlation_id: context.correlationId,
        p_idempotency_key: context.idempotencyKey,
      });
    },

    async createFollowUpTask(context, input) {
      return write('jervis_create_follow_up_task', {
        p_business_id: context.businessId,
        p_title: input.title,
        p_description: input.description ?? null,
        p_due_at: input.dueAt ?? null,
        p_entity_type: input.entityType ?? null,
        p_entity_id: input.entityId ?? null,
        p_correlation_id: context.correlationId,
        p_idempotency_key: context.idempotencyKey,
      });
    },

    async appendAuditEvent(context, input) {
      // No actor argument exists, and that is the design: `actor_category`,
      // `actor_id` and `automated` are derived inside the function from
      // `auth.uid()`. A caller-supplied actor is how an integration identity
      // would claim to be a human user.
      return write('jervis_append_audit_event', {
        p_business_id: context.businessId,
        p_entity_type: input.entityType,
        p_entity_id: input.entityId,
        p_action: input.action,
        p_previous_value: input.previousValue ?? null,
        p_new_value: input.newValue ?? null,
        p_reason: input.reason ?? null,
        p_correlation_id: context.correlationId,
        p_idempotency_key: context.idempotencyKey,
      });
    },

    async getContact(businessId, contactId) {
      return read(
        'jervis_get_contact',
        {
          p_business_id: businessId,
          p_contact_id: contactId,
        },
        toContact,
      );
    },

    async getLead(businessId, leadId) {
      return read(
        'jervis_get_lead',
        {
          p_business_id: businessId,
          p_lead_id: leadId,
        },
        toLead,
      );
    },

    async getTask(businessId, taskId) {
      return read(
        'jervis_get_task',
        {
          p_business_id: businessId,
          p_task_id: taskId,
        },
        toTask,
      );
    },

    async getAuditEventsByCorrelation(businessId, correlationId) {
      const { data, error } = await client.rpc('jervis_get_audit_events_by_correlation', {
        p_business_id: businessId,
        p_correlation_id: correlationId,
      });
      if (error) return { ok: false, error: error.message };
      const rows = Array.isArray(data) ? (data as Record<string, unknown>[]) : [];
      return { ok: true, events: rows.map(toAuditEvent) };
    },
  };
}
