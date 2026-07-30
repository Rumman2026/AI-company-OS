import type { CompactContextPackage, TaskType } from '@ai-company-os/agent-sdk';
import { InMemoryJobQueue } from '@ai-company-os/job-queue';
import { InMemoryCostController } from '@ai-company-os/cost-controller';
import { ConsoleAuditLogger } from '@ai-company-os/audit-logger';
import { providerRegistry } from '@ai-company-os/provider-adapters';
import { TaskRouter } from '@ai-company-os/task-router';
import type { PolicyContext } from '@ai-company-os/policy-engine';

// apps/worker-service is the agent-worker execution runtime (reused
// instead of creating a separate apps/agent-worker — see DECISIONS.md
// ADR-0008). It pulls routed-task jobs from packages/job-queue and
// executes them through packages/task-router. Phase 1 /
// repository-preparation fidelity: in-memory queue, no real provider
// network call.

interface RoutedTaskJob {
  taskId: string;
  taskType: TaskType;
  context: CompactContextPackage;
}

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

async function demonstrateWorkerLoop(): Promise<void> {
  const queue = new InMemoryJobQueue<RoutedTaskJob>();
  const router = new TaskRouter({
    adapters: providerRegistry,
    costController: new InMemoryCostController(),
    auditLogger: new ConsoleAuditLogger(),
  });

  queue.enqueue('agent-worker', {
    taskId: 'demo-task-1',
    taskType: 'crm-summary',
    context: {
      taskId: 'demo-task-1',
      taskType: 'crm-summary',
      summary: 'Demonstration job processed at apps/worker-service startup.',
      facts: {},
      relevantRecordIds: [],
      maxTokensHint: 500,
    },
  });

  const job = queue.dequeue('agent-worker');
  if (!job) {
    console.log('Worker Service placeholder running: no job to process');
    return;
  }

  try {
    const result = await router.routeTask({
      taskId: job.payload.taskId,
      taskType: job.payload.taskType,
      context: job.payload.context,
      policyContext: neutralPolicyContext,
      model: 'glm-4.6',
      maxInputTokens: 500,
      maxOutputTokens: 500,
      businessId: 'greencal-pressure-washing',
      agentId: 'agent-worker',
    });
    queue.ack(job.id);
    console.log('Worker Service placeholder running:', JSON.stringify(result.decision));
  } catch (error) {
    queue.fail(job.id, error instanceof Error ? error.message : 'unknown error');
  }
}

void demonstrateWorkerLoop();
