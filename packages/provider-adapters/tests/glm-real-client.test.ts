import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  GLM_API_ENDPOINT,
  buildClassificationSystemPrompt,
  buildGlmChatCompletionRequestPlan,
  callRealGlmChatCompletion,
  redactedRequestHeaders,
} from '../src/glm-lead-inquiry/real-client';

const baseParams = {
  model: 'glm-4.5-air',
  systemPrompt: buildClassificationSystemPrompt(),
  userPrompt: 'test inquiry',
  maxOutputTokens: 500,
};

test('buildGlmChatCompletionRequestPlan targets the confirmed official endpoint', () => {
  const plan = buildGlmChatCompletionRequestPlan(baseParams);
  assert.equal(plan.url, GLM_API_ENDPOINT);
  assert.equal(plan.url, 'https://api.z.ai/api/paas/v4/chat/completions');
  assert.equal(plan.method, 'POST');
});

test('buildGlmChatCompletionRequestPlan requests strict JSON structured output', () => {
  const plan = buildGlmChatCompletionRequestPlan(baseParams);
  assert.deepEqual(plan.bodyForNetwork.response_format, { type: 'json_object' });
  assert.equal(plan.bodyForNetwork.stream, false);
  assert.equal(plan.bodyForNetwork.model, 'glm-4.5-air');
});

test('redactedRequestHeaders never contains anything resembling a real key', () => {
  const headers = redactedRequestHeaders();
  assert.equal(headers.Authorization, 'Bearer [REDACTED]');
  assert.doesNotMatch(JSON.stringify(headers), /sk-|Bearer [^[]/);
});

test('callRealGlmChatCompletion parses a successful response, including real usage and request id', async (t) => {
  const originalFetch = globalThis.fetch;
  let capturedAuthHeader: string | null = null;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  globalThis.fetch = (async (_url: string, init?: RequestInit) => {
    capturedAuthHeader = (init?.headers as Record<string, string>).Authorization;
    return new Response(
      JSON.stringify({
        id: 'chatcmpl-test-123',
        choices: [{ message: { content: '{"intentCategory":"residential"}' } }],
        usage: { prompt_tokens: 42, completion_tokens: 17 },
      }),
      { status: 200 },
    );
  }) as typeof fetch;

  const result = await callRealGlmChatCompletion(
    { ...baseParams, timeoutMs: 5000 },
    'sk-test-fake-key',
  );

  assert.equal(result.rawContent, '{"intentCategory":"residential"}');
  assert.equal(result.inputTokens, 42);
  assert.equal(result.outputTokens, 17);
  assert.equal(result.requestId, 'chatcmpl-test-123');
  assert.equal(capturedAuthHeader, 'Bearer sk-test-fake-key');
});

test('callRealGlmChatCompletion throws on a non-ok HTTP status', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = (async () => new Response('unauthorized', { status: 401 })) as typeof fetch;

  await assert.rejects(
    () => callRealGlmChatCompletion({ ...baseParams, timeoutMs: 5000 }, 'sk-test-fake-key'),
    /status 401/,
  );
});

test('callRealGlmChatCompletion throws when the response has no message content', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ id: 'x', choices: [{ message: {} }] }), {
      status: 200,
    })) as typeof fetch;

  await assert.rejects(
    () => callRealGlmChatCompletion({ ...baseParams, timeoutMs: 5000 }, 'sk-test-fake-key'),
    /did not include/,
  );
});

test('callRealGlmChatCompletion aborts a hanging call at the configured timeout', async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });
  globalThis.fetch = ((_url: string, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('AbortError')));
    })) as typeof fetch;

  await assert.rejects(() =>
    callRealGlmChatCompletion({ ...baseParams, timeoutMs: 50 }, 'sk-test-fake-key'),
  );
});
