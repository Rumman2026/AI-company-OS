// Real Z.AI / GLM chat-completions client. Confirmed against official
// documentation (docs.z.ai, fetched 2026-08-03 — see
// docs/cloud/GLM_SANDBOX_PILOT.md Stage 1 for the full audit):
// endpoint, auth header format, required body fields, and JSON
// structured-output support are all officially confirmed. Nothing in
// this file logs, returns, or otherwise exposes the API key — it is
// used only as a fetch header value.

export const GLM_API_ENDPOINT = 'https://api.z.ai/api/paas/v4/chat/completions';
export const GLM_AUTH_HEADER_SCHEME = 'Bearer';

export interface GlmChatCompletionRequestPlan {
  url: string;
  method: 'POST';
  bodyForNetwork: Record<string, unknown>;
}

/**
 * Strict system prompt kept in sync with the schema in ./types.ts and
 * ./validation.ts by construction (the enum values are spelled out
 * here) — the pilot's forbidden-claim scan and schema validation are
 * the actual enforcement; this prompt is the first line of defense, not
 * the only one.
 */
export function buildClassificationSystemPrompt(): string {
  return [
    'You are a lead-inquiry classification assistant for a pressure-washing service business.',
    'Classify the customer inquiry and respond with ONLY a single JSON object, no other text, no markdown code fences, matching exactly this shape:',
    '{',
    '  "intentCategory": one of "residential" | "commercial" | "hoa" | "multi-family" | "unclear" | "spam" | "out-of-scope",',
    '  "propertyType": short free-text description of the property,',
    '  "serviceIntent": short free-text description of the specific service requested,',
    '  "summary": one or two neutral sentences summarizing the request,',
    '  "missingInformation": array of short strings describing what information is still needed,',
    '  "recommendedTemplateId": one of "template-residential-info-request" | "template-commercial-info-request" | "template-hoa-info-request" | "template-multi-family-info-request" | "template-unclear-needs-more-info" | "template-spam-no-response" | "template-escalate-to-owner",',
    '  "confidence": number between 0 and 1,',
    '  "requiresEscalation": boolean,',
    '  "escalationReasons": array of zero or more of "low-confidence" | "business-facts-conflict" | "pricing-scope-warranty-or-contract" | "customer-upset" | "high-value-lead" | "providers-disagree" | "security-auth-infra-or-production-code" | "production-deployment-or-data-change" | "policy-engine-flag" | "owner-approval-required"',
    '}',
    'CRITICAL RULES: never state, imply, or estimate a dollar amount or price; never guarantee or promise availability, timing, or service. If the inquiry asks for pricing, scope, warranty, or contract terms, set requiresEscalation to true, include "pricing-scope-warranty-or-contract" in escalationReasons, and set recommendedTemplateId to "template-escalate-to-owner" — do not attempt to answer the pricing question yourself.',
  ].join('\n');
}

export function buildGlmChatCompletionRequestPlan(params: {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  maxOutputTokens: number;
}): GlmChatCompletionRequestPlan {
  return {
    url: GLM_API_ENDPOINT,
    method: 'POST',
    bodyForNetwork: {
      model: params.model,
      messages: [
        { role: 'system', content: params.systemPrompt },
        { role: 'user', content: params.userPrompt },
      ],
      response_format: { type: 'json_object' },
      max_tokens: params.maxOutputTokens,
      stream: false,
    },
  };
}

/** Headers as they would be logged/displayed — the real key never appears here. */
export function redactedRequestHeaders(): Record<string, string> {
  return {
    Authorization: `${GLM_AUTH_HEADER_SCHEME} [REDACTED]`,
    'Content-Type': 'application/json',
  };
}

export interface RealGlmCallResult {
  rawContent: string;
  inputTokens: number;
  outputTokens: number;
  requestId: string | null;
  latencyMs: number;
}

interface GlmChatCompletionResponseBody {
  id?: string;
  choices?: Array<{ message?: { content?: string } }>;
  usage?: { prompt_tokens?: number; completion_tokens?: number };
}

/**
 * Makes exactly one real HTTP call. The caller is responsible for every
 * safety gate (kill switch, budget, request count) — this function has
 * none of its own; it is a thin, honest transport layer only.
 */
export async function callRealGlmChatCompletion(
  params: {
    model: string;
    systemPrompt: string;
    userPrompt: string;
    maxOutputTokens: number;
    timeoutMs: number;
  },
  apiKey: string,
): Promise<RealGlmCallResult> {
  const plan = buildGlmChatCompletionRequestPlan(params);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), params.timeoutMs);
  const startedAt = Date.now();
  try {
    const response = await fetch(plan.url, {
      method: plan.method,
      headers: {
        Authorization: `${GLM_AUTH_HEADER_SCHEME} ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(plan.bodyForNetwork),
      signal: controller.signal,
    });
    const latencyMs = Date.now() - startedAt;
    if (!response.ok) {
      let bodyText = '';
      try {
        bodyText = await response.text();
      } catch {
        bodyText = '';
      }
      throw new Error(
        `GLM API responded with status ${response.status}: ${bodyText.slice(0, 300)}`,
      );
    }
    const json = (await response.json()) as GlmChatCompletionResponseBody;
    const content = json.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || content.length === 0) {
      throw new Error('GLM API response did not include choices[0].message.content');
    }
    return {
      rawContent: content,
      inputTokens: json.usage?.prompt_tokens ?? 0,
      outputTokens: json.usage?.completion_tokens ?? 0,
      requestId: json.id ?? null,
      latencyMs,
    };
  } finally {
    clearTimeout(timer);
  }
}
