# migration 041 tests

Verifies `packages/db/migrations/041-e2e-fixture-rpc.sql` **without touching
Greencal-production**.

There are two suites, and they answer different questions.

## 1. `packages/db/tests/migration-041-e2e-fixture-rpc.test.ts` — always runs

Static assertions over the migration text: the function stayed no-argument, no
table privilege is granted to anyone, EXECUTE goes to `service_role` and nobody
else, the fixture ids are plpgsql constants rather than parameters, there is no
dynamic SQL, and the rollback drops the function without deleting rows.

Runs under `pnpm --filter @ai-company-os/db test`, in CI, on every machine, with
no database and no credentials. It exists because the suite below needs a
Postgres, and the regressions it catches would otherwise reach production purely
because nobody had a scratch database handy.

## 2. `test041.sql` — needs a scratch database

The behavioral half. Reading SQL cannot tell you whether the function is
idempotent, whether it actually refuses a conflicting row, or who Postgres
decided holds EXECUTE once every grant and revoke has been resolved.

### Running

```bash
createdb crm_scratch
psql "$SCRATCH_URL" -f ../migration-039/scaffold.sql   # businesses/contacts/leads
psql "$SCRATCH_URL" -f scaffold-roles.sql              # anon/authenticated/service_role
psql "$SCRATCH_URL" -f ../../migrations/041-e2e-fixture-rpc.sql
psql "$SCRATCH_URL" -v ON_ERROR_STOP=1 -f test041.sql  # asserts; exit status is the result
```

039's scaffold is reused rather than copied: it already reproduces the three
tables 041 touches, faithfully, from migrations 001/002/011. `scaffold-roles.sql`
adds only what 041 additionally needs — the three Supabase roles, holding _no_
privilege on the CRM tables, which is the production state this migration exists
because of. If the function body were deleted, `service_role` would fail for the
same reason it fails in production today.

`test041.sql` ends in `rollback` — it proves behavior and leaves no state.

### What it proves

Creation, then idempotency (a second identical call reports creating and
resetting nothing), then repeatability: it archives the fixture Lead exactly the
way the E2E suite's own last step does and checks that re-provisioning restores
canonical state — the property that makes two consecutive
`test:e2e:tenant-isolation` runs both pass.

Then the three refusals, each followed by a check that **the conflicting row was
left untouched**: a Contact on the fixture id with a different name, a Lead on
the fixture id re-pointed at GreenCal, and the isolation-tenant business row
renamed or re-slugged. A refusal that had already half-written is not a refusal,
which is why each is asserted in two parts.

Finally the privilege model, in three parts, because any one alone would be
misleading: `service_role` holds EXECUTE; `anon` and `authenticated` do not; and
`service_role` holds **no** SELECT/INSERT/UPDATE/DELETE on `contacts`, `leads` or
`businesses`. The script then does the real thing — `set role service_role`,
calls the function successfully, and confirms that the same role still cannot
`select` from `public.contacts`. That pair is the whole design in two statements.

## Not covered here

Tenant isolation itself — that RLS keeps Tenant B out of Tenant A's rows — is
proven separately by `apps/admin-console`'s `test:e2e:tenant-isolation` suite,
against the real project, where the real policies live. This directory proves
only that the fixture that suite depends on can be provisioned safely.
