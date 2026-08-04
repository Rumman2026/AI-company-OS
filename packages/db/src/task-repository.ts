import { createTaskId, type Task, type NotableEntityType } from '@ai-company-os/core-models';
import type { MinimalSupabaseClient } from './supabase-client';

export interface CreateTaskInput {
  readonly businessId: string;
  readonly title: string;
  readonly description?: string;
  readonly dueAt?: string;
  readonly assignedTo?: string;
  readonly entityType?: NotableEntityType;
  readonly entityId?: string;
  readonly createdBy?: string;
}

export interface ListTasksOptions {
  readonly entityType?: NotableEntityType;
  readonly entityId?: string;
  readonly completed?: boolean;
}

export type CreateTaskResult = { ok: true; task: Task } | { ok: false; error: string };
export type ListTasksResult = { ok: true; tasks: Task[] } | { ok: false; error: string };
export type CompleteTaskResult = { ok: true } | { ok: false; error: string };

export interface TaskRepository {
  createTask(input: CreateTaskInput): Promise<CreateTaskResult>;
  listTasks(businessId: string, options?: ListTasksOptions): Promise<ListTasksResult>;
  /** Marks a Task completed - the only state change a Task ever undergoes. */
  completeTask(
    businessId: string,
    taskId: string,
    completedBy?: string,
  ): Promise<CompleteTaskResult>;
}

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  assigned_to: string | null;
  entity_type: NotableEntityType | null;
  entity_id: string | null;
  completed: boolean;
  created_by: string | null;
  completed_at: string | null;
  completed_by: string | null;
  created_at: string;
}

function toTask(row: TaskRow): Task {
  return {
    id: createTaskId(row.id),
    title: row.title,
    description: row.description ?? undefined,
    dueAt: row.due_at ?? undefined,
    assignedTo: row.assigned_to ?? undefined,
    entityType: row.entity_type ?? undefined,
    entityId: row.entity_id ?? undefined,
    completed: row.completed,
    createdBy: row.created_by ?? undefined,
    completedAt: row.completed_at ?? undefined,
    completedBy: row.completed_by ?? undefined,
    createdAt: row.created_at,
  };
}

const SELECT_COLUMNS =
  'id, title, description, due_at, assigned_to, entity_type, entity_id, completed, created_by, completed_at, completed_by, created_at';

export function createSupabaseTaskRepository(client: MinimalSupabaseClient): TaskRepository {
  return {
    async createTask(input) {
      const { data, error } = await client
        .from('tasks')
        .insert({
          business_id: input.businessId,
          title: input.title,
          description: input.description ?? null,
          due_at: input.dueAt ?? null,
          assigned_to: input.assignedTo ?? null,
          entity_type: input.entityType ?? null,
          entity_id: input.entityId ?? null,
          completed: false,
          created_by: input.createdBy ?? null,
          completed_at: null,
          completed_by: null,
        })
        .select(SELECT_COLUMNS)
        .single();

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'task_insert_failed' };
      }
      return { ok: true, task: toTask(data as TaskRow) };
    },

    async listTasks(businessId, options = {}) {
      let query = client
        .from('tasks')
        .select(SELECT_COLUMNS)
        .eq('business_id', businessId)
        .order('due_at', { ascending: true });

      if (options.entityType) query = query.eq('entity_type', options.entityType);
      if (options.entityId) query = query.eq('entity_id', options.entityId);
      if (typeof options.completed === 'boolean') query = query.eq('completed', options.completed);

      const { data, error } = await query;

      if (error || !data) {
        return { ok: false, error: error?.message ?? 'task_list_failed' };
      }
      return { ok: true, tasks: (data as TaskRow[]).map(toTask) };
    },

    async completeTask(businessId, taskId, completedBy) {
      const { error } = await client
        .from('tasks')
        .update({
          completed: true,
          completed_at: new Date().toISOString(),
          completed_by: completedBy ?? null,
        })
        .eq('id', taskId)
        .eq('business_id', businessId);

      if (error) {
        return { ok: false, error: error.message ?? 'task_complete_failed' };
      }
      return { ok: true };
    },
  };
}
