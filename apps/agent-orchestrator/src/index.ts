import { InMemoryJobQueue } from '@ai-company-os/job-queue';
import { ConsoleAuditLogger } from '@ai-company-os/audit-logger';
import type { RoutedTaskJob } from '@ai-company-os/task-router';
import { AgentOrchestrator } from './orchestrator';

// apps/agent-orchestrator is Jervis's orchestration engine (see
// DECISIONS.md ADR-0017): it decides which named agent
// (src/agent-registry.ts) is authorized to handle a task, before
// anything is enqueued for apps/worker-service to execute. Distinct
// from apps/jervis-api (owner-facing control: health/budget/kill
// switches) and apps/worker-service (execution). Phase 1 /
// repository-preparation fidelity: in-memory queue, no real provider
// network call anywhere behind this.

function demonstrateOrchestration(): void {
  const jobQueue = new InMemoryJobQueue<RoutedTaskJob>();
  const orchestrator = new AgentOrchestrator(jobQueue, new ConsoleAuditLogger());

  const authorized = orchestrator.assignTask({
    agentId: 'emma',
    taskId: 'demo-task-1',
    taskType: 'customer-response',
    businessId: 'greencal-pressure-washing',
    context: {
      taskId: 'demo-task-1',
      taskType: 'customer-response',
      summary: 'Demonstration assignment at apps/agent-orchestrator startup.',
      facts: {},
      relevantRecordIds: [],
      maxTokensHint: 500,
    },
  });

  const rejected = orchestrator.assignTask({
    agentId: 'emma',
    taskId: 'demo-task-2',
    taskType: 'seo-research',
    businessId: 'greencal-pressure-washing',
    context: {
      taskId: 'demo-task-2',
      taskType: 'seo-research',
      summary: 'Emma is not registered for seo-research - this must be rejected, not routed.',
      facts: {},
      relevantRecordIds: [],
      maxTokensHint: 500,
    },
  });

  console.log('Agent Orchestrator (Jervis) demo:', JSON.stringify({ authorized, rejected }));
}

demonstrateOrchestration();
