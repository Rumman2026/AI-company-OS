import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseTaskRepository } from '../src/task-repository';
import { createFakeSupabaseClient, type FakeTable } from './fake-supabase';

const BUSINESS_A = 'business-a';
const BUSINESS_B = 'business-b';

function setup(seed: Array<Record<string, unknown>> = []) {
  const tasks: FakeTable = { rows: [...seed], nextId: 1 };
  const client = createFakeSupabaseClient({ tasks });
  const repo = createSupabaseTaskRepository(client);
  return { repo, tasks };
}

test('createTask inserts a new, incomplete task scoped to the business', async () => {
  const { repo, tasks } = setup();

  const result = await repo.createTask({ businessId: BUSINESS_A, title: 'Follow up with lead' });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.task.title, 'Follow up with lead');
    assert.equal(result.task.completed, false);
    assert.equal(result.task.completedAt, undefined);
  }
  assert.equal(tasks.rows[0].business_id, BUSINESS_A);
});

test('createTask accepts an optional entity attachment', async () => {
  const { repo } = setup();

  const result = await repo.createTask({
    businessId: BUSINESS_A,
    title: 'Call about estimate',
    entityType: 'lead',
    entityId: 'lead-1',
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.task.entityType, 'lead');
    assert.equal(result.task.entityId, 'lead-1');
  }
});

test("listTasks returns only the calling business's tasks, optionally filtered by entity and completion", async () => {
  const { repo } = setup([
    {
      id: 'task-1',
      business_id: BUSINESS_A,
      title: 'Task 1',
      description: null,
      due_at: null,
      assigned_to: null,
      entity_type: 'lead',
      entity_id: 'lead-1',
      completed: false,
      completed_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
    {
      id: 'task-2',
      business_id: BUSINESS_A,
      title: 'Task 2 (different lead)',
      description: null,
      due_at: null,
      assigned_to: null,
      entity_type: 'lead',
      entity_id: 'lead-2',
      completed: true,
      completed_at: '2026-01-02T00:00:00.000Z',
      created_at: '2026-01-02T00:00:00.000Z',
    },
    {
      id: 'task-3',
      business_id: BUSINESS_B,
      title: 'Other tenant task',
      description: null,
      due_at: null,
      assigned_to: null,
      entity_type: 'lead',
      entity_id: 'lead-1',
      completed: false,
      completed_at: null,
      created_at: '2026-01-03T00:00:00.000Z',
    },
  ]);

  const all = await repo.listTasks(BUSINESS_A);
  assert.equal(all.ok, true);
  if (all.ok) assert.equal(all.tasks.length, 2, "must never include another business's task");

  const forLead1 = await repo.listTasks(BUSINESS_A, { entityType: 'lead', entityId: 'lead-1' });
  assert.equal(forLead1.ok, true);
  if (forLead1.ok) {
    assert.equal(forLead1.tasks.length, 1);
    assert.equal(forLead1.tasks[0].id, 'task-1');
  }

  const openOnly = await repo.listTasks(BUSINESS_A, { completed: false });
  assert.equal(openOnly.ok, true);
  if (openOnly.ok) {
    assert.equal(openOnly.tasks.length, 1);
    assert.equal(openOnly.tasks[0].id, 'task-1');
  }
});

test('completeTask sets completed and completedAt on the correct business-scoped task only', async () => {
  const { repo, tasks } = setup([
    {
      id: 'task-1',
      business_id: BUSINESS_A,
      title: 'Task 1',
      description: null,
      due_at: null,
      assigned_to: null,
      entity_type: null,
      entity_id: null,
      completed: false,
      completed_at: null,
      created_at: '2026-01-01T00:00:00.000Z',
    },
  ]);

  const crossTenant = await repo.completeTask(BUSINESS_B, 'task-1');
  assert.equal(crossTenant.ok, true);
  assert.equal(tasks.rows[0].completed, false, 'a cross-tenant complete must not affect the row');

  const result = await repo.completeTask(BUSINESS_A, 'task-1');
  assert.equal(result.ok, true);
  assert.equal(tasks.rows[0].completed, true);
  assert.notEqual(tasks.rows[0].completed_at, null);
});
