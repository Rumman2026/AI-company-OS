import { test } from 'node:test';
import assert from 'node:assert/strict';
import { InMemoryJobQueue } from '../src/in-memory-job-queue';

test('enqueue/dequeue is FIFO per queue name', () => {
  const queue = new InMemoryJobQueue<{ n: number }>();
  queue.enqueue('website-health', { n: 1 });
  queue.enqueue('website-health', { n: 2 });

  const first = queue.dequeue('website-health');
  const second = queue.dequeue('website-health');

  assert.equal(first?.payload.n, 1);
  assert.equal(second?.payload.n, 2);
  assert.equal(queue.dequeue('website-health'), null);
});

test('fail() requeues until maxAttempts, then marks failed', () => {
  const queue = new InMemoryJobQueue<string>();
  const job = queue.enqueue('retry-test', 'payload', { maxAttempts: 2 });

  queue.dequeue('retry-test');
  queue.fail(job.id, 'first failure');
  assert.equal(queue.size('retry-test'), 1);

  const redequeued = queue.dequeue('retry-test');
  assert.equal(redequeued?.attempts, 2);
  queue.fail(job.id, 'second failure');
  assert.equal(queue.size('retry-test'), 0);
});

test('ack() marks a job completed', () => {
  const queue = new InMemoryJobQueue<string>();
  const job = queue.enqueue('q', 'payload');
  queue.dequeue('q');
  queue.ack(job.id);
  assert.equal(queue.size('q'), 0);
});
