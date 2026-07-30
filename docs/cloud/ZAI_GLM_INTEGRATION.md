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

## Current state

`zai-glm-adapter.ts` is a placeholder — no API call, no credential
exists yet. Model ids in its descriptor (`glm-4.6`, `glm-4.6-air`) are
illustrative placeholders pending confirmation at real integration time.
Real integration is future work requiring separate explicit owner
authorization.
