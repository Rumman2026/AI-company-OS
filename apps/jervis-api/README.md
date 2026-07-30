# Jervis API

Owner-facing control API for the AI Company OS cloud infrastructure:
provider health, per-scope budget status, provider/agent kill switches,
and audit-log queries. No Hermes/Jervis code existed anywhere in this
repository before this stage — this is a fully new, non-duplicating
addition (confirmed by a repository-wide audit; see
[DECISIONS.md](../../DECISIONS.md) ADR-0008).

Phase 1 / repository-preparation fidelity: no HTTP server, no production
access, no credential read. Kill switches exposed here (`ControlPlane.engageProviderKillSwitch`,
`engageAgentKillSwitch`) are only ever invoked by explicit owner action —
no agent or provider can call them on itself (see
[docs/cloud/AGENT_SECURITY_MODEL.md](../../docs/cloud/AGENT_SECURITY_MODEL.md)).
