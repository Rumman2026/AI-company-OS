# Cost Controller Package

Per-provider, per-agent, and per-business budget tracking with daily and
monthly spending limits and kill switches, for the AI gateway/task-router.
In-memory only in this stage — no real spend occurs anywhere upstream of
this package yet (no provider adapter makes a real network call). Real
persistence is future Hostinger-VPS work (Redis/Postgres).

New, non-duplicating package — see [DECISIONS.md](../../DECISIONS.md)
ADR-0008 and [docs/cloud/COST_CONTROL_POLICY.md](../../docs/cloud/COST_CONTROL_POLICY.md).
