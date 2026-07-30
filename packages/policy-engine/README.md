# Policy Engine Package

Runtime implementation of the escalation rules and authority rules for
the AI gateway/task-router: `evaluateEscalation()` decides whether a task
must escalate to Claude (never a default all-providers chain);
`checkAuthority()` enforces that no provider/agent can independently
push to main, merge a PR, deploy production, modify production data,
alter credentials, disable tests/security controls, approve its own
output, access an unrelated repository, or exceed its assigned budget.

This is the runtime companion to the planning guidance in
[config/policies/README.md](../../config/policies/README.md) — that
directory documents policy/governance intent; this package implements
it. New, non-duplicating package — see [DECISIONS.md](../../DECISIONS.md)
ADR-0008.
