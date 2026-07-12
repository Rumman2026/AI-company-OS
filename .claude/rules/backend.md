---
paths:
  - 'apps/api-gateway/**'
  - 'apps/core-api/**'
  - 'apps/agent-orchestrator/**'
  - 'apps/worker-service/**'
  - 'packages/auth/**'
  - 'packages/db/**'
  - 'packages/core-models/**'
  - 'packages/agent-sdk/**'
  - 'packages/telemetry/**'
  - 'packages/platform-utils/**'
  - 'packages/toolkit/**'
---

# Backend rule

Scope: the four Node/TypeScript services (`api-gateway`, `core-api`,
`agent-orchestrator`, `worker-service`) and the shared backend packages
they depend on (`auth`, `db`, `core-models`, `agent-sdk`, `telemetry`,
`platform-utils`, `toolkit`).

- Every service and package here currently contains only a placeholder
  `src/index.ts` — there is no existing framework, ORM, or request layer
  to follow. Check `package.json` before assuming a library is available.
- Shared concerns (auth, data access, domain models, agent contracts,
  telemetry) belong in the corresponding `packages/*`, not duplicated
  inside an individual app.
- No database engine, schema, or migration tooling exists yet in
  `packages/db` — do not invent one; see [ARCHITECTURE.md](../../ARCHITECTURE.md)
  and [DECISIONS.md](../../DECISIONS.md) before choosing one.
- Service ports and env vars are defined in `docker-compose.dev.yml` and
  `config/env/.env.example` — keep new services/config consistent with
  that wiring rather than introducing a parallel convention.
- Never hardcode secrets, credentials, or connection strings in service
  code — see [.claude/rules/security.md](security.md) for `infra/secrets`
  and `config/policies` handling.
