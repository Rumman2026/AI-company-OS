# DB Package

Persistence for the domain model already defined in
[`@ai-company-os/core-models`](../core-models/README.md) - read that
package's README first. This package does not define entities or business
rules; it only stores and retrieves what core-models already models, and
routes every state change through core-models' own state machines.

See [DECISIONS.md](../../DECISIONS.md) ADR-0009 for the full rationale
(why Supabase/Postgres with hand-written SQL, why new tables rather than
repurposing GreenCal's `quote_leads`, and what is explicitly deferred).

## What this package contains (Milestone 1)

- `migrations/001-crm-foundation.sql` - `contacts`, `leads`, and
  `audit_log` tables. Hand-written SQL, run once by the owner in the
  Supabase SQL Editor - there is no migration-runner tool, matching the
  only precedent already proven in production
  (`apps/greencal-website`'s `supabase-schema.sql`).
- `ContactRepository` (`contact-repository.ts`) - find-or-create a
  `Contact` by phone or email.
- `LeadRepository` (`lead-repository.ts`) - create a `Lead` at its initial
  `new` status, and transition an existing `Lead`'s status. Every
  transition calls core-models' `transitionLead()` - this package never
  writes a status value that function didn't return.
- `AuditLogRepository` (`audit-log-repository.ts`) - persists exactly the
  `ProposedAuditRecord` a state-machine transition returns.
- `createDbClient()` - a thin Supabase client factory, constructed only
  from a trusted server context with the service-role key.

## What is deliberately excluded from this milestone

An authenticated owner interface, RBAC beyond the service-role/anon split,
companies/deals/jobs/estimates/appointments/calls/tasks/campaigns
persistence, search/filtering/CSV export/reporting, and any UI. See
`docs/crm/CRM_ARCHITECTURE.md` for the full status breakdown.

## Security model

Row Level Security is enabled on every table with **no** permissive
policies - only the service-role key (server-only) can read or write.
Never construct `createDbClient()` from browser-reachable code.

## Scripts

- `pnpm run lint` - ESLint
- `pnpm run typecheck` - `tsc --noEmit`
- `pnpm run test` - `tsx --test "tests/**/*.test.ts"` (Node's built-in test
  runner, same pattern as `@ai-company-os/core-models` and
  `@ai-company-os/audit-logger`)
- `pnpm run format` - Prettier
