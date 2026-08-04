import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { CompactContextPackage } from '@ai-company-os/agent-sdk';
import { InMemoryJobQueue } from '@ai-company-os/job-queue';
import { ConsoleAuditLogger } from '@ai-company-os/audit-logger';
import type { RoutedTaskJob } from '@ai-company-os/task-router';
import { AgentOrchestrator } from '../src/orchestrator';

function context(taskId: string): CompactContextPackage {
  return {
    taskId,
    taskType: 'customer-response',
    summary: 'test',
    facts: {},
    relevantRecordIds: [],
    maxTokensHint: 100,
  };
}

function buildOrchestrator() {
  const jobQueue = new InMemoryJobQueue<RoutedTaskJob>();
  const orchestrator = new AgentOrchestrator(jobQueue, new ConsoleAuditLogger());
  return { orchestrator, jobQueue };
}

test('assigning a permitted task type to its agent enqueues a job for apps/worker-service', () => {
  const { orchestrator, jobQueue } = buildOrchestrator();

  const result = orchestrator.assignTask({
    agentId: 'emma',
    taskId: 't1',
    taskType: 'customer-response',
    businessId: 'greencal-pressure-washing',
    context: context('t1'),
  });

  assert.equal(result.authorized, true);
  if (result.authorized) {
    assert.equal(result.job.payload.agentId, 'emma');
    assert.equal(result.job.payload.taskType, 'customer-response');
    assert.equal(result.job.payload.businessId, 'greencal-pressure-washing');
  }
  assert.equal(
    jobQueue.size('agent-worker'),
    1,
    'the job must land in the shared agent-worker queue',
  );
});

test('assigning a task type the agent is not permitted for is rejected and never enqueued', () => {
  const { orchestrator, jobQueue } = buildOrchestrator();

  const result = orchestrator.assignTask({
    agentId: 'emma',
    taskId: 't2',
    taskType: 'seo-research',
    businessId: 'greencal-pressure-washing',
    context: { ...context('t2'), taskType: 'seo-research' },
  });

  assert.equal(result.authorized, false);
  if (!result.authorized) {
    assert.match(result.reason, /not permitted/);
  }
  assert.equal(
    jobQueue.size('agent-worker'),
    0,
    'a rejected assignment must never reach the queue',
  );
});

test('two agents permitted for the same task type are each independently authorized', () => {
  const { orchestrator } = buildOrchestrator();

  const forEstimateAgent = orchestrator.assignTask({
    agentId: 'estimate-agent',
    taskId: 't3',
    taskType: 'crm-summary',
    businessId: 'greencal-pressure-washing',
    context: { ...context('t3'), taskType: 'crm-summary' },
  });
  const forSchedulingAgent = orchestrator.assignTask({
    agentId: 'scheduling-agent',
    taskId: 't4',
    taskType: 'crm-summary',
    businessId: 'greencal-pressure-washing',
    context: { ...context('t4'), taskType: 'crm-summary' },
  });

  assert.equal(forEstimateAgent.authorized, true);
  assert.equal(forSchedulingAgent.authorized, true);
});
