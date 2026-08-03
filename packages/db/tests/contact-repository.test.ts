import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSupabaseContactRepository } from '../src/contact-repository';
import type { MinimalSupabaseClient } from '../src/supabase-client';

interface FakeContactRow {
  id: string;
  display_name: string;
  phone: string | null;
  email: string | null;
  created_at: string;
}

function createFakeClient(seed: FakeContactRow[] = []) {
  const rows = [...seed];
  let nextId = 1;

  const client = {
    from(table: string) {
      assert.equal(table, 'contacts');
      return {
        select(_cols: string) {
          return {
            or(filter: string) {
              // Postgrest's `or()` syntax is `column.operator.value` - only
              // the first two dots are delimiters, since `value` itself may
              // contain dots (e.g. an email address). Splitting on every
              // dot would truncate that value.
              const conditions = filter.split(',').map((f) => {
                const firstDot = f.indexOf('.');
                const secondDot = f.indexOf('.', firstDot + 1);
                return { col: f.slice(0, firstDot), value: f.slice(secondDot + 1) };
              });
              return {
                limit(_n: number) {
                  return {
                    async maybeSingle() {
                      const match = rows.find((row) =>
                        conditions.some(
                          (c) => (row as unknown as Record<string, string>)[c.col] === c.value,
                        ),
                      );
                      return { data: match ?? null, error: null };
                    },
                  };
                },
              };
            },
          };
        },
        insert(values: Partial<FakeContactRow>) {
          return {
            select(_cols: string) {
              return {
                async single() {
                  const row: FakeContactRow = {
                    id: String(nextId++),
                    display_name: values.display_name ?? '',
                    phone: values.phone ?? null,
                    email: values.email ?? null,
                    created_at: '2026-01-01T00:00:00.000Z',
                  };
                  rows.push(row);
                  return { data: row, error: null };
                },
              };
            },
          };
        },
      };
    },
  };

  return { client: client as unknown as MinimalSupabaseClient, rows };
}

test('creates a new contact when no phone or email match exists', async () => {
  const { client, rows } = createFakeClient();
  const repo = createSupabaseContactRepository(client);

  const result = await repo.findOrCreateContact({
    displayName: 'Jane Doe',
    phone: '5551234567',
    email: 'jane@example.com',
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.created, true);
    assert.equal(result.contact.displayName, 'Jane Doe');
  }
  assert.equal(rows.length, 1);
});

test('finds an existing contact by phone instead of creating a duplicate', async () => {
  const { client, rows } = createFakeClient([
    {
      id: 'existing-1',
      display_name: 'Jane Doe',
      phone: '5551234567',
      email: 'jane@example.com',
      created_at: '2025-01-01T00:00:00.000Z',
    },
  ]);
  const repo = createSupabaseContactRepository(client);

  const result = await repo.findOrCreateContact({
    displayName: 'Jane Doe',
    phone: '5551234567',
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.created, false);
    assert.equal(result.contact.id, 'existing-1');
  }
  assert.equal(rows.length, 1, 'no new row should be inserted');
});

test('finds an existing contact by email when phone is not provided', async () => {
  const { client } = createFakeClient([
    {
      id: 'existing-2',
      display_name: 'John Smith',
      phone: null,
      email: 'john@example.com',
      created_at: '2025-01-01T00:00:00.000Z',
    },
  ]);
  const repo = createSupabaseContactRepository(client);

  const result = await repo.findOrCreateContact({
    displayName: 'John Smith',
    email: 'john@example.com',
  });

  assert.equal(result.ok, true);
  if (result.ok) {
    assert.equal(result.created, false);
    assert.equal(result.contact.id, 'existing-2');
  }
});

test('propagates a lookup failure as a typed error rather than throwing', async () => {
  const client = {
    from() {
      return {
        select() {
          return {
            or() {
              return {
                limit() {
                  return {
                    async maybeSingle() {
                      return { data: null, error: { message: 'connection refused' } };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  } as unknown as MinimalSupabaseClient;

  const repo = createSupabaseContactRepository(client);
  const result = await repo.findOrCreateContact({ displayName: 'X', phone: '1' });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error, 'connection refused');
  }
});
