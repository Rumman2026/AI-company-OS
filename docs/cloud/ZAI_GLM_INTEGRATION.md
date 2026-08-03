# Z.AI / GLM Integration

Status: durable reference. See [DECISIONS.md](../../DECISIONS.md)
ADR-0008 and [docs/cloud/AI_PROVIDER_INTEGRATION.md](AI_PROVIDER_INTEGRATION.md).

Z.AI/GLM is the **default low-cost text/data/coding worker** — the
primary provider for most routine task types in
`packages/task-router/src/routing-policies.ts`: `lead-qualification`,
`crm-summary`, `content-drafting`, `coding`, `debugging`, and
`website-monitoring`.

## Role

- Lead classification, inquiry summaries, CRM notes, routine follow-up
  drafts, data formatting, repetitive content tasks.
- First-pass coding and basic debugging.
- Test generation.

DeepSeek is GLM's fallback for `crm-summary` and `debugging` — the
router never calls DeepSeek if GLM already completed the task
successfully (see
[docs/cloud/AI_ROUTING_AND_TOKEN_POLICY.md](AI_ROUTING_AND_TOKEN_POLICY.md)).

## Escalation out of GLM

Escalate to Claude when confidence is low, business facts conflict,
pricing/contract language appears, the task affects security/auth/
production code, or any other condition in
`packages/policy-engine`'s `evaluateEscalation()` fires — GLM is the
default, not the ceiling, for these task types.

## Confirmed provider facts (2026-08-03)

Per docs.z.ai, fetched 2026-08-03 (see
[docs/cloud/GLM_SANDBOX_PILOT.md](GLM_SANDBOX_PILOT.md) Stage 1 for the
full categorized audit): real, currently listed model ids include
`glm-4.5-air`, `glm-4.6`, and `glm-5.2`; GLM-4.6's context window is
200,000 input tokens / 128,000 output tokens; GLM-4.5-Air is priced at
$0.20/1M input and $1.10/1M output tokens (the cheapest listed model
capable of structured classification); GLM-4.6 is priced at $0.60/1M
input and $2.20/1M output. Real per-account rate limits are not publicly
documented and remain unconfirmed/blocked from live use until a real
account exists.

## GLM-only sandbox pilot

The first concrete GLM use case is `lead_inquiry_classification` — a
low-risk, GLM-only pilot (no other provider activated) covering
inquiry classification, summarization, missing-information detection,
and approved-template recommendation, with strict schema validation,
budget enforcement, and no ability to quote pricing, promise
availability, contact customers, or trigger another provider. See
[docs/cloud/GLM_SANDBOX_PILOT.md](GLM_SANDBOX_PILOT.md) for the full
design, budget policy, and mocked test coverage
(`packages/provider-adapters/src/glm-lead-inquiry/`).

## Confirmed API mechanics (docs.z.ai, fetched 2026-08-03)

Endpoint `https://api.z.ai/api/paas/v4/chat/completions` (POST);
authentication via `Authorization: Bearer <api-key>`; required body
fields `model` and `messages`; structured JSON output via
`response_format: { "type": "json_object" }`. See
[docs/cloud/GLM_SANDBOX_PILOT.md](GLM_SANDBOX_PILOT.md) "Real credential
and single-call pilot" for the full table and the code that implements
this (`packages/provider-adapters/src/glm-lead-inquiry/real-client.ts`).

## Current state

`zai-glm-adapter.ts`'s placeholder path (used by the general
`packages/provider-adapters` registry) still makes no API call. A
separate, real HTTP transport now exists specifically for the
`lead_inquiry_classification` pilot
(`packages/provider-adapters/src/glm-lead-inquiry/real-client.ts` +
`real-pilot-runner.ts`), proven end-to-end against a mocked network —
see GLM_SANDBOX_PILOT.md. No real credential has been used; the pilot is
paused at the credential checkpoint pending owner setup and explicit
confirmation to resume. `modelAllowlist`, token limits, and
cost-per-token remain the confirmed values above (GLM-4.5-Air pricing
specifically — see the known simplification noted in
GLM_SANDBOX_PILOT.md about one flat rate covering three
differently-priced models).
