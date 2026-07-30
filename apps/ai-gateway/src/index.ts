import { randomUUID } from 'node:crypto';
import { buildContextPackage } from '@ai-company-os/context-builder';
import { NormalizedKeyCache } from '@ai-company-os/semantic-cache';
import { InMemoryCostController } from '@ai-company-os/cost-controller';
import { ConsoleAuditLogger } from '@ai-company-os/audit-logger';
import { providerRegistry } from '@ai-company-os/provider-adapters';
import { TaskRouter } from '@ai-company-os/task-router';
import type { PolicyContext } from '@ai-company-os/policy-engine';

// Provider-neutral AI routing gateway. Distinct from apps/api-gateway
// (the platform's own edge/API gateway) — see
// docs/cloud/CLOUD_ARCHITECTURE.md. Phase 1 / repository-preparation
// fidelity: this entry point wires the real router/context-builder/
// cache/cost-controller/audit-logger together and demonstrates one
// routed task at startup. No HTTP server, no real provider network
// call, no credential is read anywhere in this file.

const neutralPolicyContext: PolicyContext = {
  confidence: 0.95,
  businessFactsConflict: false,
  involvesPricingScopeWarrantyOrContract: false,
  customerSentiment: 'neutral',
  isHighValueLead: false,
  providersDisagree: false,
  affectsSecurityAuthInfraOrProduction: false,
  requestsProductionDeploymentOrDataChange: false,
  policyEngineFlagged: false,
  ownerApprovalRequired: false,
};

async function demonstrateGatewayWiring(): Promise<void> {
  const router = new TaskRouter({
    adapters: providerRegistry,
    costController: new InMemoryCostController(),
    auditLogger: new ConsoleAuditLogger(),
  });
  const responseCache = new NormalizedKeyCache<unknown>();

  const taskId = randomUUID();
  const context = buildContextPackage({
    taskId,
    taskType: 'website-monitoring',
    summary: 'Demonstration task run at apps/ai-gateway startup.',
    facts: { business: 'greencal-pressure-washing' },
    relevantRecordIds: [],
  });

  const cacheKey = `${context.taskType}:${context.summary}`;
  if (responseCache.has(cacheKey)) {
    console.log('AI Gateway: cache hit, skipping router call');
    return;
  }

  const result = await router.routeTask({
    taskId,
    taskType: 'website-monitoring',
    context,
    policyContext: neutralPolicyContext,
    model: 'glm-4.6',
    maxInputTokens: 500,
    maxOutputTokens: 500,
    businessId: 'greencal-pressure-washing',
    agentId: 'greencal-website-health-agent',
  });

  responseCache.set(cacheKey, result.response, { ttlMs: 60_000 });
  console.log('AI Gateway placeholder running:', JSON.stringify(result.decision));
}

void demonstrateGatewayWiring();
