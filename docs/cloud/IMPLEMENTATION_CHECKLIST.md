# Implementation Checklist

Status: durable reference tracking the Cost-Efficient Multi-Model Cloud
Infrastructure Preparation Stage. See [DECISIONS.md](../../DECISIONS.md)
ADR-0008. Update this file's checkmarks only when repository evidence
actually exists — do not mark a stage done without it (see
`verify-work` skill).

## Stage status

- [x] **Stage 1 — Audit**: existing repo/infra inspected; reuse-vs-new
      findings recorded in ADR-0008 (worker-service over agent-worker,
      agent-sdk over agent-contracts).
- [x] **Stage 2 — Architecture**: `docs/cloud/CLOUD_ARCHITECTURE.md`
      with Mermaid diagram and provider-substitution design.
- [x] **Stage 3 — Repository preparation**: `apps/ai-gateway`,
      `apps/jervis-api`, nine `packages/*` (provider-adapters, task-router,
      context-builder, semantic-cache, policy-engine, job-queue,
      audit-logger, cost-controller, plus `agent-sdk` extended), and
      `infra/hostinger`, `infra/docker`, `infra/monitoring`, `infra/backups`.
- [x] **Stage 4 — Provider contracts**: `ProviderCapabilityDescriptor`/
      `ProviderAdapter` in `packages/agent-sdk`; placeholder adapters for
      all 7 approved providers in `packages/provider-adapters`, each with a
      real (passing) test suite verifying no fabricated success and no
      banned provider.
- [x] **Stage 5 — Task router**: `packages/task-router` implementing
      the deterministic-first, single-primary-provider, bounded-escalation,
      single-fallback routing framework with real tests.
- [x] **Stage 6 — Docker preparation**: `infra/docker/docker-compose.cloud.yml`
      template (not deployed) covering reverse proxy, PostgreSQL, Redis,
      n8n, AI gateway, agent worker, and monitoring.
- [x] **Stage 7 — GitHub workflow**: `docs/cloud/GITHUB_AGENT_WORKFLOW.md`
      documenting the controlled pipeline (not yet automated beyond existing
      lint/typecheck CI).
- [x] **Stage 8 — First business agent design**:
      `docs/agents/GREENCAL_WEBSITE_AND_LEAD_HEALTH_AGENT.md`.
- [x] **Required documentation set**: all 11 documents listed in
      `docs/INDEX.md`'s "Cloud infrastructure documents" table.
- [ ] **Verification**: repository-wide `pnpm lint`/`pnpm typecheck`/
      `pnpm build` and the new packages' own test suites — see the
      completion report for exact results at the time this stage was run.
- [ ] **Real provider connection** — not started; requires separate
      explicit owner authorization (ADR-0008 scope note).
- [ ] **Hostinger VPS provisioning** — not started; see
      `docs/cloud/HOSTINGER_VPS_SETUP.md`.
- [ ] **Any deployment** — not started.

## Explicitly not in scope for this stage

- Connecting any real AI provider account or credential.
- Making any real, paid AI API call.
- Connecting to Hostinger.
- Deploying anything.
- Modifying `apps/greencal-website` or its approved stack (ADR-0004–0007).
- Modifying any production system or production data.

## Recommended next execution stage

See the completion report delivered at the end of this stage for a
specific recommendation — this file tracks status, not the narrative
report.
