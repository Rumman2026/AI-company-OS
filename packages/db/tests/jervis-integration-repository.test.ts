import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createSupabaseJervisIntegrationRepository,
  type JervisRpcClient,
} from '../src/jervis-integration-repository';

/**
 * These prove the ADAPTER, not the database. Migration 039/040's authorization,
 * tenant isolation, idempotency and concurrency are proven against real
 * Postgres in packages/db/tests/migration-039/ - a fake cannot test a SECURITY
 * DEFINER function's body, and pretending otherwise would be the more dangerous
 * of the two mistakes.
 *
 * What is worth pinning here is the contract this repository sends and the
 * shape it returns: the argument names the RPCs expect, that no actor field is
 * ever transmitted, and that "not visible" arrives as `record: null` rather than
 * an error a caller might retry.
 */

const BUSINESS = '23489f4c-aa29-46fb-b639-38024f8da89c';
const OTHER_BUSINESS = 'bbbbbbbb-0000-0000-0000-000000000002';

interface Call {
  readonly name: string;
  readonly args: Record<string, unknown>;
}

function setup(reply: unknown = null, error: { message: string } | null = null) {
  const calls: Call[] = [];
  const client: JervisRpcClient = {
    rpc: (async (name: string, args: Record<string, unknown>) => {
      calls.push({ name, args });
      return { data: error ? null : reply, error };
    }) as JervisRpcClient['rpc'],
  };
  return { repo: createSupabaseJervisIntegrationRepository(client), calls };
}

const CONTEXT = {
  businessId: BUSINESS,
  correlationId: 'jervis-isolation-loop-88ce9c732c',
  idempotencyKey: 'idem-1',
};

// --- writes ----------------------------------------------------------------

test('createContact calls the RPC with the exact parameter names 039 declares', async () => {
  const { repo, calls } = setup('8fb661fd-6d62-4134-919b-9f085136145c');

  const result = await repo.createContact(CONTEXT, {
    displayName: 'Priya Raman',
    email: 'priya@example.test',
  });

  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.id, '8fb661fd-6d62-4134-919b-9f085136145c');
  assert.equal(calls.length, 1);
  assert.equal(calls[0].name, 'jervis_create_contact');
  assert.deepEqual(calls[0].args, {
    p_business_id: BUSINESS,
    p_display_name: 'Priya Raman',
    p_email: 'priya@example.test',
    p_phone: null,
    p_correlation_id: 'jervis-isolation-loop-88ce9c732c',
    p_idempotency_key: 'idem-1',
  });
});

test('an omitted optional field is sent as null, never dropped', async () => {
  // A dropped key would take PostgREST's default for the argument rather than
  // this caller's intent, and the two differ the moment a default is added.
  const { repo, calls } = setup('id-1');
  await repo.createFollowUpTask(CONTEXT, { title: 'Call Priya' });

  assert.deepEqual(calls[0].args, {
    p_business_id: BUSINESS,
    p_title: 'Call Priya',
    p_description: null,
    p_due_at: null,
    p_entity_type: null,
    p_entity_id: null,
    p_correlation_id: CONTEXT.correlationId,
    p_idempotency_key: 'idem-1',
  });
});

test('no write ever transmits an actor identity', async () => {
  // The RPCs derive actor_category, actor_id and automated from auth.uid().
  // A caller-supplied actor is how an integration identity would claim to be a
  // human user, so the adapter must not have a way to send one.
  const { repo, calls } = setup('id-1');

  await repo.createContact(CONTEXT, { displayName: 'A' });
  await repo.createLead(CONTEXT, { contactId: 'c-1' });
  await repo.createFollowUpTask(CONTEXT, { title: 'T' });
  await repo.appendAuditEvent(CONTEXT, {
    entityType: 'lead',
    entityId: 'l-1',
    action: 'lead.qualified',
  });

  const forbidden = ['actor', 'p_actor_id', 'p_actor_category', 'p_automated', 'p_actor'];
  for (const call of calls) {
    for (const key of Object.keys(call.args)) {
      assert.equal(
        forbidden.includes(key),
        false,
        `${call.name} transmitted an actor field: ${key}`,
      );
    }
  }
});

test('correlation id and idempotency key are sent as separate arguments', async () => {
  // They answer different questions: one traces a workflow, the other prevents
  // a duplicate. Collapsing them would make every retry a new workflow.
  const { repo, calls } = setup('id-1');
  await repo.createLead(
    { ...CONTEXT, correlationId: 'corr-x', idempotencyKey: 'idem-x' },
    { contactId: 'c-1', channel: 'web-form' },
  );

  assert.equal(calls[0].args.p_correlation_id, 'corr-x');
  assert.equal(calls[0].args.p_idempotency_key, 'idem-x');
  assert.notEqual(calls[0].args.p_correlation_id, calls[0].args.p_idempotency_key);
});

test('a database refusal surfaces as an error result, never as a success', async () => {
  const { repo } = setup(null, {
    message: 'jervis: caller is not an active integration identity for this business',
  });

  const result = await repo.createContact(CONTEXT, { displayName: 'Denied' });

  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.error, /not an active integration identity/);
});

// --- reads -----------------------------------------------------------------

test('getContact maps the RPC row into the repository shape', async () => {
  const { repo, calls } = setup([
    {
      id: '8fb661fd-6d62-4134-919b-9f085136145c',
      business_id: BUSINESS,
      display_name: 'Priya Raman',
      email: 'priya@example.test',
      phone: null,
      archived_at: null,
      created_at: '2026-08-23T12:00:00Z',
    },
  ]);

  const result = await repo.getContact(BUSINESS, '8fb661fd-6d62-4134-919b-9f085136145c');

  assert.equal(calls[0].name, 'jervis_get_contact');
  assert.deepEqual(calls[0].args, {
    p_business_id: BUSINESS,
    p_contact_id: '8fb661fd-6d62-4134-919b-9f085136145c',
  });
  assert.equal(result.ok, true);
  if (result.ok && result.record) {
    assert.equal(result.record.displayName, 'Priya Raman');
    assert.equal(result.record.businessId, BUSINESS);
    // null becomes undefined rather than the string "null"
    assert.equal(result.record.phone, undefined);
    assert.equal(result.record.archivedAt, undefined);
  }
});

test('a record that is not visible arrives as null, not as an error', async () => {
  // The RPCs return zero rows both for a record that does not exist and for one
  // belonging to another tenant - deliberately indistinguishable. Surfacing that
  // as an error would invite a caller to retry a boundary that will never open.
  const { repo } = setup([]);

  const result = await repo.getContact(BUSINESS, 'someone-elses-id');

  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.record, null);
});

test('getTask never exposes assigned_to even if the row carries it', async () => {
  // assigned_to is a staff member's auth.users id. Migration 040 does not return
  // it; this asserts the adapter would not leak it either if the shape changed.
  const { repo } = setup([
    {
      id: 't-1',
      business_id: BUSINESS,
      title: 'Call Priya',
      description: null,
      due_at: null,
      entity_type: 'lead',
      entity_id: 'l-1',
      completed: false,
      completed_at: null,
      created_at: '2026-08-23T12:00:00Z',
      assigned_to: 'a-human-user-id',
    },
  ]);

  const result = await repo.getTask(BUSINESS, 't-1');

  assert.equal(result.ok, true);
  if (result.ok && result.record) {
    assert.equal('assignedTo' in result.record, false);
    assert.equal(JSON.stringify(result.record).includes('a-human-user-id'), false);
  }
});

test('the audit read requires both business and correlation', async () => {
  // Neither argument is optional in the adapter, because a business-only read
  // would be "this tenant's entire audit history".
  const { repo, calls } = setup([
    {
      id: 'a-1',
      business_id: BUSINESS,
      entity_type: 'lead',
      entity_id: 'l-1',
      action: 'lead.created',
      previous_value: '',
      new_value: 'new',
      actor_category: 'automation',
      actor_id: '3f0d8d96-82c8-4c02-bbbc-0aef9533bd20',
      automated: true,
      occurred_at: '2026-08-23T12:00:00Z',
      reason: null,
      correlation_id: 'corr-1',
    },
  ]);

  const result = await repo.getAuditEventsByCorrelation(BUSINESS, 'corr-1');

  assert.deepEqual(calls[0].args, {
    p_business_id: BUSINESS,
    p_correlation_id: 'corr-1',
  });
  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.events.length, 1);
    assert.equal(result.events[0].actorCategory, 'automation');
    assert.equal(result.events[0].automated, true);
  }
});

test('the tenant is always the caller-supplied one, never inferred from a row', async () => {
  // The RPC filters on business_id itself; this pins that the adapter passes
  // through what it was asked for rather than reading it off a returned record.
  const { repo, calls } = setup([]);
  await repo.getLead(OTHER_BUSINESS, 'l-1');
  assert.equal(calls[0].args.p_business_id, OTHER_BUSINESS);
});
