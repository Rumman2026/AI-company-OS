# Context Builder Package

Builds compact, task-scoped context packages (`CompactContextPackage`,
from `packages/agent-sdk`) for the AI gateway/task-router instead of
sending full repositories, CRM histories, business documentation, or long
prior conversations to any provider.

New, non-duplicating package — see [DECISIONS.md](../../DECISIONS.md)
ADR-0008 and [docs/cloud/AI_ROUTING_AND_TOKEN_POLICY.md](../../docs/cloud/AI_ROUTING_AND_TOKEN_POLICY.md).

Retrieval of _which_ facts/records are relevant is the caller's
responsibility — this package only enforces size limits and truncation,
it does not perform search or ranking.
