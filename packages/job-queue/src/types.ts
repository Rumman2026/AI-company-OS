export type JobStatus = 'queued' | 'in-progress' | 'completed' | 'failed';

export interface Job<TPayload> {
  id: string;
  queue: string;
  payload: TPayload;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  enqueuedAtIso: string;
  lastError: string | null;
}

export interface JobQueue<TPayload> {
  enqueue(queue: string, payload: TPayload, options?: { maxAttempts?: number }): Job<TPayload>;
  dequeue(queue: string): Job<TPayload> | null;
  ack(jobId: string): void;
  fail(jobId: string, error: string): void;
  size(queue: string): number;
}
