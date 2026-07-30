# Audit Logger Package

Secret-redacted, compliance-oriented audit trail for provider calls,
spend, policy decisions, and escalations across the AI gateway/task
router/agent workers.

**Distinct from `packages/telemetry`** (general instrumentation helpers,
still an empty placeholder): audit events are security/compliance
records with their own retention and integrity requirements, not general
observability data. See [DECISIONS.md](../../DECISIONS.md) ADR-0008 for
why these are kept as two separate packages rather than one. If
`packages/telemetry` gains real instrumentation later, the two should
still stay separate — telemetry may be sampled/dropped under load, audit
events must not be.

Console-backed only in this stage — durable, append-only storage is
future Hostinger-VPS work. `redactSecrets()` strips any key matching
`/key|token|secret|password|credential|authorization/i` at any depth
before an event is recorded or logged; never bypass this.
