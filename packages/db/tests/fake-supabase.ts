import type { MinimalSupabaseClient } from '../src/supabase-client';

/**
 * A minimal, hand-rolled fake standing in for @supabase/supabase-js's
 * chainable query builder - just enough surface for this package's
 * repositories (select/eq/or/limit/single/maybeSingle/insert/update).
 * Shared across this directory's test files so each one doesn't
 * re-implement the same chain-parsing logic.
 */
export interface FakeTable {
  rows: Array<Record<string, unknown>>;
  nextId: number;
}

export function createFakeSupabaseClient(tables: Record<string, FakeTable>) {
  function parseOrFilter(filter: string): Array<{ col: string; value: string }> {
    return filter.split(',').map((f) => {
      const firstDot = f.indexOf('.');
      const secondDot = f.indexOf('.', firstDot + 1);
      return { col: f.slice(0, firstDot), value: f.slice(secondDot + 1) };
    });
  }

  function makeSelectChain(rows: Array<Record<string, unknown>>) {
    let filtered = rows;
    const chain = {
      eq(col: string, value: unknown) {
        filtered = filtered.filter((r) => String(r[col]) === String(value));
        return chain;
      },
      or(filter: string) {
        const conditions = parseOrFilter(filter);
        filtered = filtered.filter((r) => conditions.some((c) => String(r[c.col]) === c.value));
        return chain;
      },
      limit(_n: number) {
        return chain;
      },
      async maybeSingle() {
        return { data: filtered[0] ?? null, error: null };
      },
      async single() {
        return filtered[0]
          ? { data: filtered[0], error: null }
          : { data: null, error: { message: 'not found' } };
      },
    };
    return chain;
  }

  function makeUpdateChain(table: FakeTable, values: Record<string, unknown>) {
    let filtered = table.rows;
    const chain = {
      eq(col: string, value: unknown) {
        filtered = filtered.filter((r) => String(r[col]) === String(value));
        return chain;
      },
      then(resolve: (result: { error: null }) => void) {
        for (const row of filtered) Object.assign(row, values);
        resolve({ error: null });
      },
    };
    return chain;
  }

  const client = {
    from(tableName: string) {
      const table = tables[tableName];
      if (!table) throw new Error(`fake table not configured: ${tableName}`);
      return {
        select(_cols?: string) {
          return makeSelectChain(table.rows);
        },
        insert(values: Record<string, unknown>) {
          return {
            select(_cols?: string) {
              return {
                async single() {
                  const row = {
                    id: String(table.nextId++),
                    created_at: '2026-01-01T00:00:00.000Z',
                    ...values,
                  };
                  table.rows.push(row);
                  return { data: row, error: null };
                },
              };
            },
            async then(resolve: (result: { error: null }) => void) {
              const row = {
                id: String(table.nextId++),
                created_at: '2026-01-01T00:00:00.000Z',
                ...values,
              };
              table.rows.push(row);
              resolve({ error: null });
            },
          };
        },
        update(values: Record<string, unknown>) {
          return makeUpdateChain(table, values);
        },
      };
    },
  };

  return client as unknown as MinimalSupabaseClient;
}
