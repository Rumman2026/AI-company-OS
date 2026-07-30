import type { HealthStatus, ProviderId } from '@ai-company-os/agent-sdk';
import type { AuditLogger } from '@ai-company-os/audit-logger';
import type { InMemoryCostController } from '@ai-company-os/cost-controller';
import { providerRegistry } from '@ai-company-os/provider-adapters';

export interface ProviderHealthSummary {
  providerId: ProviderId;
  status: HealthStatus;
  killSwitchEnabled: boolean;
}

/**
 * Owner-facing control surface: provider health, budget status, kill
 * switches, and audit queries. This is a plain function surface, not an
 * HTTP server, for this repository-preparation stage — see
 * docs/cloud/CLOUD_ARCHITECTURE.md. No provider-wide or agent-specific
 * kill switch here can be engaged by anything other than direct,
 * explicit owner action (enforced structurally: this module exposes the
 * calls, it does not call them itself except in the startup demo).
 */
export class ControlPlane {
  constructor(
    private readonly costController: InMemoryCostController,
    private readonly auditLogger: AuditLogger,
  ) {}

  async getProviderHealth(): Promise<ProviderHealthSummary[]> {
    const summaries: ProviderHealthSummary[] = [];
    for (const adapter of Object.values(providerRegistry)) {
      const health = await adapter.healthCheck();
      summaries.push({
        providerId: adapter.descriptor.providerId,
        status: health.status,
        killSwitchEnabled: adapter.descriptor.killSwitchEnabled,
      });
    }
    return summaries;
  }

  getBudgetStatus(scope: 'global' | 'provider' | 'agent' | 'business', scopeId: string) {
    return this.costController.getStatus(scope, scopeId);
  }

  engageProviderKillSwitch(scopeId: string): void {
    this.costController.engageKillSwitch('provider', scopeId);
    this.auditLogger.record({
      actor: { kind: 'owner' },
      action: 'engage-kill-switch',
      taskId: null,
      taskType: null,
      outcome: 'success',
      metadata: { scope: 'provider', scopeId },
    });
  }

  engageAgentKillSwitch(scopeId: string): void {
    this.costController.engageKillSwitch('agent', scopeId);
    this.auditLogger.record({
      actor: { kind: 'owner' },
      action: 'engage-kill-switch',
      taskId: null,
      taskType: null,
      outcome: 'success',
      metadata: { scope: 'agent', scopeId },
    });
  }

  queryAudit() {
    return this.auditLogger.query();
  }
}
