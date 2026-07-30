# Kimi Code CLI Integration

Status: durable reference. See [DECISIONS.md](../../DECISIONS.md)
ADR-0008 and [docs/cloud/AI_PROVIDER_INTEGRATION.md](AI_PROVIDER_INTEGRATION.md).

Kimi Code CLI is approved as a **restricted secondary coding worker**
only — `packages/provider-adapters/src/kimi-adapter.ts`'s descriptor
permits only `coding` and `debugging` task types.

## Restrictions (enforced by `packages/policy-engine`, not by Kimi itself)

Kimi must run only in an isolated Git branch or worktree — never
directly against `main` or a branch another provider/agent is actively
using. Kimi output must pass through the exact same policy engine,
testing requirements, Git controls, audit logging, and review process as
code produced by any other provider (see
[docs/cloud/GITHUB_AGENT_WORKFLOW.md](GITHUB_AGENT_WORKFLOW.md)).

Kimi must never: push to `main`, merge pull requests, deploy production,
access production credentials, modify production data, disable tests, or
disable security controls. `packages/policy-engine`'s `checkAuthority()`
blocks all of these for any non-owner actor, Kimi included — this is not
a Kimi-specific carve-out, it's the same authority rule applied to every
provider.

## Routing

`packages/task-router/src/routing-policies.ts` names GLM as the primary
provider for `coding`/`debugging`; Kimi is a fallback/secondary worker
role for isolated-branch coding tasks, not the default. Escalate to
Claude for any security-, auth-, or infrastructure-affecting code
regardless of which coding worker (GLM or Kimi) produced it.

## Current state

`kimi-adapter.ts` is a placeholder — no CLI invocation, no network call,
no credential exists yet. Real integration (invoking the actual Kimi
Code CLI in an isolated worktree, capturing its diff, and running it
through the pipeline above) is future work requiring separate explicit
owner authorization.
