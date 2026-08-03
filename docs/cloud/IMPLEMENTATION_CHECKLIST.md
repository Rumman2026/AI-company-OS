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
- [x] **Verification**: repository-wide `pnpm lint`/`pnpm typecheck`
      passed; the new packages' own test suites passed at the time this
      stage was run — see the completion report for exact results.
- [x] **CI extension**: `.github/workflows/ci.yml` extended with pnpm/
      Node caching and repo-wide (except greencal-website) test/build
      steps, reusing existing pnpm filter commands — no duplicated CI
      logic.
- [x] **AI Provider Configuration Validation and GLM Sandbox Pilot
      Preparation**: provider descriptor audit categorized into
      confirmed/default/illustrative/blocked
      (`docs/cloud/GLM_SANDBOX_PILOT.md` Stage 1); `zaiGlmDescriptor`
      updated with real, sourced model ids/pricing/context window;
      conservative pilot-specific budget policy
      (`packages/provider-adapters/src/glm-lead-inquiry/pilot-budget.ts`);
      hardened, schema-validated `lead_inquiry_classification` pilot
      adapter with timeout/retry/budget/kill-switch/confidence-threshold
      handling; a reusable mocked sandbox harness covering all seven
      required scenarios plus every required proof point. GLM remains
      the only provider prepared for pilot activation — OpenAI,
      Anthropic API, Gemini, DeepSeek, Perplexity, and Kimi remain
      unconnected.
- [ ] **Real provider connection** — not started; requires separate
      explicit owner authorization (ADR-0008 scope note), and — for
      GLM specifically — the exact information listed in
      `docs/cloud/GLM_SANDBOX_PILOT.md`'s completion report before any
      real API call.
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
- Activating any provider other than a prepared (not connected) GLM pilot.

## Recommended next execution stage

See the completion report delivered at the end of this stage for a
specific recommendation — this file tracks status, not the narrative
report.
