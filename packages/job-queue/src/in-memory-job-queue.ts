import { randomUUID } from 'node:crypto';
import type { Job, JobQueue } from './types';

const DEFAULT_MAX_ATTEMPTS = 3;

/**
 * In-memory placeholder queue. A real deployment routes this through
 * Redis on the Hostinger VPS (see docs/cloud/CLOUD_ARCHITECTURE.md) —
 * this implementation exists so packages/task-router and
 * apps/worker-service have a real, testable contract to build against
 * before that infrastructure is provisioned.
 */
export class InMemoryJobQueue<TPayload> implements JobQueue<TPayload> {
  private readonly jobs = new Map<string, Job<TPayload>>();
  private readonly queues = new Map<string, string[]>();

  enqueue(queue: string, payload: TPayload, options: { maxAttempts?: number } = {}): Job<TPayload> {
    const job: Job<TPayload> = {
      id: randomUUID(),
      queue,
      payload,
      status: 'queued',
      attempts: 0,
      maxAttempts: options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS,
      enqueuedAtIso: new Date().toISOString(),
      lastError: null,
    };
    this.jobs.set(job.id, job);
    const list = this.queues.get(queue) ?? [];
    list.push(job.id);
    this.queues.set(queue, list);
    return job;
  }

  dequeue(queue: string): Job<TPayload> | null {
    const list = this.queues.get(queue);
    if (!list || list.length === 0) {
      return null;
    }
    const jobId = list.shift();
    if (!jobId) {
      return null;
    }
    const job = this.jobs.get(jobId);
    if (!job) {
      return null;
    }
    job.status = 'in-progress';
    job.attempts += 1;
    return job;
  }

  ack(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = 'completed';
    }
  }

  fail(jobId: string, error: string): void {
    const job = this.jobs.get(jobId);
    if (!job) {
      return;
    }
    job.lastError = error;
    if (job.attempts < job.maxAttempts) {
      job.status = 'queued';
      const list = this.queues.get(job.queue) ?? [];
      list.push(job.id);
      this.queues.set(job.queue, list);
    } else {
      job.status = 'failed';
    }
  }

  size(queue: string): number {
    return this.queues.get(queue)?.length ?? 0;
  }
}
