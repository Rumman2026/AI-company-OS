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
    let filtered = [...rows];
    let sortCol: string | null = null;
    let sortAscending = true;
    let rangeFrom: number | null = null;
    let rangeTo: number | null = null;

    function materialize() {
      let result = filtered;
      if (sortCol) {
        const col = sortCol;
        result = [...result].sort((a, b) => {
          const av = String(a[col]);
          const bv = String(b[col]);
          return sortAscending ? av.localeCompare(bv) : bv.localeCompare(av);
        });
      }
      if (rangeFrom !== null && rangeTo !== null) {
        result = result.slice(rangeFrom, rangeTo + 1);
      }
      return result;
    }

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
      ilike(col: string, pattern: string) {
        const needle = pattern.replace(/%/g, '').toLowerCase();
        filtered = filtered.filter((r) =>
          String(r[col] ?? '')
            .toLowerCase()
            .includes(needle),
        );
        return chain;
      },
      limit(_n: number) {
        return chain;
      },
      order(col: string, opts?: { ascending?: boolean }) {
        sortCol = col;
        sortAscending = opts?.ascending ?? true;
        return chain;
      },
      range(from: number, to: number) {
        rangeFrom = from;
        rangeTo = to;
        return chain;
      },
      async maybeSingle() {
        const result = materialize();
        return { data: result[0] ?? null, error: null };
      },
      async single() {
        const result = materialize();
        return result[0]
          ? { data: result[0], error: null }
          : { data: null, error: { message: 'not found' } };
      },
      then(resolve: (result: { data: Array<Record<string, unknown>>; error: null }) => void) {
        resolve({ data: materialize(), error: null });
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

  const storageObjects = new Map<string, Set<string>>();

  const client = {
    storage: {
      from(bucket: string) {
        if (!storageObjects.has(bucket)) storageObjects.set(bucket, new Set());
        const objects = storageObjects.get(bucket)!;
        return {
          async upload(path: string, _file: unknown) {
            objects.add(path);
            return { data: { path }, error: null };
          },
          async createSignedUrl(path: string, expiresIn: number) {
            if (!objects.has(path)) {
              return { data: null, error: { message: 'object not found' } };
            }
            return {
              data: { signedUrl: `fake://${bucket}/${path}?expires=${expiresIn}` },
              error: null,
            };
          },
        };
      },
    },
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
