import type { CompactContextPackage, TaskType } from '@ai-company-os/agent-sdk';
import type { AuditLogger } from '@ai-company-os/audit-logger';
import type { Job, JobQueue } from '@ai-company-os/job-queue';
import type { RoutedTaskJob } from '@ai-company-os/task-router';
import { type AgentId, isAgentPermittedForTaskType } from './agent-registry';

export interface AssignTaskInput {
  agentId: AgentId;
  taskId: string;
  taskType: TaskType;
  businessId: string;
  context: CompactContextPackage;
}

export type AssignTaskResult =
  { authorized: true; job: Job<RoutedTaskJob> } | { authorized: false; reason: string };

const AGENT_WORKER_QUEUE = 'agent-worker';

/**
 * Jervis's orchestration engine (apps/agent-orchestrator - see
 * DECISIONS.md ADR-0017). Distinct from apps/jervis-api (owner-facing
 * control: health/budget/kill-switches) and apps/worker-service
 * (execution: drains the queue and runs packages/task-router) - this is
 * the layer in between, deciding WHICH named agent (packages/agent-sdk
 * TaskType, apps/agent-orchestrator/src/agent-registry.ts AgentId) is
 * authorized to handle a task, before it is ever enqueued for
 * execution. An unauthorized assignment is rejected here and never
 * reaches the job queue or a provider.
 */
export class AgentOrchestrator {
  constructor(
    private readonly jobQueue: JobQueue<RoutedTaskJob>,
    private readonly auditLogger: AuditLogger,
  ) {}

  assignTask(input: AssignTaskInput): AssignTaskResult {
    if (!isAgentPermittedForTaskType(input.agentId, input.taskType)) {
      this.auditLogger.record({
        actor: { kind: 'agent', agentId: input.agentId },
        action: 'assign-task',
        taskId: input.taskId,
        taskType: input.taskType,
        outcome: 'rejected',
        metadata: {
          reason: `Agent "${input.agentId}" is not permitted to handle task type "${input.taskType}".`,
        },
      });
      return {
        authorized: false,
        reason: `Agent "${input.agentId}" is not permitted to handle task type "${input.taskType}".`,
      };
    }

    const job = this.jobQueue.enqueue(AGENT_WORKER_QUEUE, {
      taskId: input.taskId,
      taskType: input.taskType,
      context: input.context,
      agentId: input.agentId,
      businessId: input.businessId,
    });

    this.auditLogger.record({
      actor: { kind: 'agent', agentId: input.agentId },
      action: 'assign-task',
      taskId: input.taskId,
      taskType: input.taskType,
      outcome: 'success',
      metadata: { queuedJobId: job.id },
    });

    return { authorized: true, job };
  }
}
