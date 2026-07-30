---
paths:
  - 'apps/api-gateway/**'
  - 'apps/core-api/**'
  - 'apps/agent-orchestrator/**'
  - 'apps/worker-service/**'
  - 'apps/ai-gateway/**'
  - 'apps/jervis-api/**'
  - 'packages/auth/**'
  - 'packages/db/**'
  - 'packages/core-models/**'
  - 'packages/agent-sdk/**'
  - 'packages/telemetry/**'
  - 'packages/platform-utils/**'
  - 'packages/toolkit/**'
  - 'packages/provider-adapters/**'
  - 'packages/task-router/**'
  - 'packages/context-builder/**'
  - 'packages/semantic-cache/**'
  - 'packages/policy-engine/**'
  - 'packages/job-queue/**'
  - 'packages/audit-logger/**'
  - 'packages/cost-controller/**'
---

# Backend rule

Scope: the Node/TypeScript services (`api-gateway`, `core-api`,
`agent-orchestrator`, `worker-service`, `ai-gateway`, `jervis-api`) and
the shared backend packages they depend on (`auth`, `db`, `core-models`,
`agent-sdk`, `telemetry`, `platform-utils`, `toolkit`,
`provider-adapters`, `task-router`, `context-builder`, `semantic-cache`,
`policy-engine`, `job-queue`, `audit-logger`, `cost-controller`).

- `api-gateway`, `core-api`, and `agent-orchestrator` currently contain
  only a placeholder `src/index.ts` — there is no existing framework,
  ORM, or request layer to follow there. Check `package.json` before
  assuming a library is available.
- `worker-service`, `ai-gateway`, `jervis-api`, and the AI-gateway/router
  packages listed above have real, tested placeholder implementations as
  of [DECISIONS.md](../../DECISIONS.md) ADR-0008 (contracts, routing
  logic, policy/cost/audit tracking) — but still make no real AI-provider
  network call. Do not add a real provider network call, credential read,
  or production wiring to any of them without separate, explicit owner
  authorization.
- Shared concerns (auth, data access, domain models, agent contracts,
  telemetry) belong in the corresponding `packages/*`, not duplicated
  inside an individual app.
- No database engine, schema, or migration tooling exists yet in
  `packages/db` — do not invent one; see [ARCHITECTURE.md](../../ARCHITECTURE.md)
  and [DECISIONS.md](../../DECISIONS.md) before choosing one.
- Service ports and env vars are defined in `docker-compose.dev.yml` and
  `config/env/.env.example` (local dev) or `infra/docker/docker-compose.cloud.yml`
  and `infra/docker/.env.cloud.example` (future Hostinger cloud stack) —
  keep new services/config consistent with the relevant existing wiring
  rather than introducing a parallel convention.
- Never hardcode secrets, credentials, or connection strings in service
  code — see [.claude/rules/security.md](security.md) for `infra/secrets`,
  `infra/docker`, and `config/policies` handling.
- Only the seven providers approved in [DECISIONS.md](../../DECISIONS.md)
  ADR-0008 (Anthropic, OpenAI, Z.AI/GLM, DeepSeek, Perplexity, Gemini,
  Kimi) may appear in `packages/provider-adapters` — never add Grok/xAI
  or Sakana AI.
