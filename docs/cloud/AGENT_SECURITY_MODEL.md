# Agent Security Model

Status: durable reference. See [DECISIONS.md](../../DECISIONS.md)
ADR-0008. Describes the least-privilege, kill-switch, and authority-rule
design shared by every provider/agent in this cloud-infrastructure track.

## Least privilege

- No agent or provider adapter reads real credentials in this stage —
  none exist. When real integration happens, each provider gets its own
  scoped credential (never a shared key across providers), added only to
  `.env`/`.env.cloud` (never committed) per
  [.claude/rules/security.md](../../.claude/rules/security.md).
- SSH-key-only access and a non-root deployment user are required for
  the future Hostinger VPS (see
  [docs/cloud/HOSTINGER_VPS_SETUP.md](HOSTINGER_VPS_SETUP.md)).
- Container isolation: `infra/docker/docker-compose.cloud.yml` runs
  `ai-gateway`/`agent-worker` as the non-root `node` user, and uses
  official non-root images (`nginxinc/nginx-unprivileged`, `postgres`,
  `n8n`) elsewhere, each on an internal `backend` network.

## Authority rules (`packages/policy-engine`'s `checkAuthority()`)

No specialist provider or agent may independently: push to `main`, merge
a pull request, deploy production, modify production data, alter
credentials, disable tests, disable security controls, approve its own
output, access an unrelated repository, or exceed its assigned token/
spending limit. These are structural — `checkAuthority()` blocks every
one of them unless the caller is the owner, regardless of which provider
is asking.

## Kill switches

- **Provider-wide**: `ProviderCapabilityDescriptor.killSwitchEnabled` —
  when true, `createPlaceholderAdapter()`'s `invoke()` returns
  `disabled-provider` immediately, and the router's single bounded
  fallback attempt takes over (or the task is rejected if no substitute
  is authorized).
- **Agent-specific**: `packages/cost-controller`'s
  `engageKillSwitch('agent', agentId)` — forces that agent's budget
  status to `withinBudget: false`, blocking further spend.
- Both are only ever engaged by explicit owner action through
  `apps/jervis-api`'s `ControlPlane` — no agent or provider can disable
  itself or another provider.

## Audit and secret handling

Every routed task is recorded by `packages/audit-logger`'s
`ConsoleAuditLogger`, which runs all metadata through `redactSecrets()`
(strips any key matching `/key|token|secret|password|credential|authorization/i`
at any depth) before logging — even if a caller passes a secret-shaped
field by mistake, it never appears in the audit trail.

## Provider substitution and continuity

Because every call goes through the shared `ProviderAdapter` contract
and the `providerRegistry` map (never a direct per-provider import),
disabling any single provider cannot break the gateway as a whole — see
[docs/cloud/AI_PROVIDER_INTEGRATION.md](AI_PROVIDER_INTEGRATION.md)'s
substitution section.

## Emergency shutdown

Not yet implemented as a single command in this stage — the closest
equivalent today is engaging every provider's kill switch via
`apps/jervis-api`'s `ControlPlane.engageProviderKillSwitch()` one at a
time, or stopping the `infra/docker/docker-compose.cloud.yml` stack
entirely (once it is ever actually running). A single emergency-shutdown
control is recommended future work — see
[docs/cloud/IMPLEMENTATION_CHECKLIST.md](IMPLEMENTATION_CHECKLIST.md).
