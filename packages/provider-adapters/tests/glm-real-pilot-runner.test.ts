import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  dryRunRealPilotCall,
  executeRealPilotCall,
} from '../src/glm-lead-inquiry/real-pilot-runner';
import {
  hoaOrangeCountyRealPilotRequest,
  hoaOrangeCountyRealPilotExpectedResponse,
} from '../src/glm-lead-inquiry/fixtures';

function mockSuccessfulFetch(callCounter: { count: number }) {
  return (async () => {
    callCounter.count += 1;
    return new Response(
      JSON.stringify({
        id: 'chatcmpl-real-pilot-test',
        choices: [
          { message: { content: JSON.stringify(hoaOrangeCountyRealPilotExpectedResponse) } },
        ],
        usage: { prompt_tokens: 55, completion_tokens: 61 },
      }),
      { status: 200 },
    );
  }) as typeof fetch;
}

test('dryRunRealPilotCall never touches the network and reports the confirmed endpoint/model', async (t) => {
  const originalFetch = globalThis.fetch;
  const callCounter = { count: 0 };
  globalThis.fetch = (async () => {
    callCounter.count += 1;
    throw new Error('dry run must never call fetch');
  }) as typeof fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const report = dryRunRealPilotCall(hoaOrangeCountyRealPilotRequest);

  assert.equal(report.mode, 'dry-run');
  assert.equal(report.endpoint, 'https://api.z.ai/api/paas/v4/chat/completions');
  assert.equal(report.model, 'glm-4.5-air');
  assert.equal(report.outcome, null);
  assert.equal(callCounter.count, 0);
});

test('executeRealPilotCall makes exactly one call, records real usage, and disables the provider afterward', async (t) => {
  const originalFetch = globalThis.fetch;
  const callCounter = { count: 0 };
  globalThis.fetch = mockSuccessfulFetch(callCounter);
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const report = await executeRealPilotCall(
    hoaOrangeCountyRealPilotRequest,
    'sk-test-fake-key-not-real',
  );

  assert.equal(report.mode, 'real-call');
  assert.equal(report.outcome?.status, 'success');
  assert.equal(report.outcome?.result?.intentCategory, 'hoa');
  assert.equal(report.outcome?.result?.requiresEscalation, true);
  assert.deepEqual(report.outcome?.result?.escalationReasons, [
    'pricing-scope-warranty-or-contract',
  ]);
  assert.doesNotMatch(report.outcome?.result?.summary ?? '', /\$\d/);

  assert.equal(report.realCallMeta?.requestId, 'chatcmpl-real-pilot-test');
  assert.equal(report.realCallMeta?.realInputTokens, 55);
  assert.equal(report.realCallMeta?.realOutputTokens, 61);
  assert.ok(typeof report.auditEventId === 'string' && report.auditEventId.length > 0);

  assert.equal(report.killSwitchEngagedAfter, true);
  assert.equal(report.killSwitchVerified, true);

  // Exactly one real network call — the post-call verification step
  // must be blocked by the kill switch before ever reaching fetch again.
  assert.equal(callCounter.count, 1);
});

test('executeRealPilotCall never exposes the API key anywhere in the report', async (t) => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = mockSuccessfulFetch({ count: 0 });
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const secretKey = 'sk-should-never-appear-anywhere';
  const report = await executeRealPilotCall(hoaOrangeCountyRealPilotRequest, secretKey);

  assert.ok(!JSON.stringify(report).includes(secretKey));
});
