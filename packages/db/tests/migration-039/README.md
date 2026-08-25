# migration 039 tests

Verifies `packages/db/migrations/039-jervis-integration-rpcs.sql` **without
touching Greencal-production**.

## Why a scratch database

039's authorization lives inside SECURITY DEFINER function bodies, so proving it
means _calling_ the functions as several different identities. Doing that against
production would mean creating real rows to watch them be refused. These run
against a throwaway database instead.

`scaffold.sql` reproduces only the columns, types, null-ness and constraints 039
depends on, copied from migrations 001/002/004/006 — if any of those drift, 039
fails here rather than in production. It stubs `auth.uid()` with a session GUC so
one script can act as different callers. It deliberately does **not** reproduce
Supabase's RLS policies: this proves 039's own logic. Tenant isolation is proven
separately, against the real project where the real policies live.

## Running

```bash
createdb crm_scratch
psql "$SCRATCH_URL" -f scaffold.sql
psql "$SCRATCH_URL" -f ../../migrations/039-jervis-integration-rpcs.sql
psql "$SCRATCH_URL" -v ON_ERROR_STOP=1 -f test039.sql   # asserts; exit status is the result
python concurrency.py "$SCRATCH_URL"                     # needs two real connections
```

## What each proves

`test039.sql` — the positive loop (contact → lead → task → audit, provenance
derived not supplied), replay returning the same id with no second row, and every
denial: ordinary authenticated human, revoked identity, unauthenticated, the two
real businesses, and all three referential tenant checks.

One fixture detail carries most of the weight: **the Jervis identity is given a
real membership in GreenCal Pressure Washing.** Without it, the GreenCal denial
would pass because the membership check failed, and the allowlist would be
untested. With it, only the allowlist can be what refuses.

`concurrency.py` — the branch a single psql session cannot reach. Two real
connections race the same idempotency key through a barrier; the losing thread
blocks on the winner's uncommitted claim via `SELECT .. FOR UPDATE`. Asserts both
that exactly one CRM row exists and that both callers received the same id —
either alone is insufficient.
