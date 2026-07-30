import type { CompactContextPackage, TaskType } from '@ai-company-os/agent-sdk';

// Token-efficiency requirement (root CLAUDE.md / DECISIONS.md ADR-0008):
// never send full repositories, CRM histories, business histories, or
// long conversations when a compact context package is sufficient.
const DEFAULT_MAX_FACTS = 20;
const DEFAULT_MAX_SUMMARY_CHARS = 1200;
const DEFAULT_MAX_TOKENS_HINT = 2000;

export interface BuildContextInput {
  taskId: string;
  taskType: TaskType;
  summary: string;
  facts: Record<string, string | number | boolean>;
  relevantRecordIds: string[];
  maxFacts?: number;
  maxSummaryChars?: number;
  maxTokensHint?: number;
}

/**
 * Builds a compact, task-scoped context package. Callers must pass only
 * facts and record ids already known to be relevant to the task — this
 * function trims to configured limits, it does not perform retrieval.
 */
export function buildContextPackage(input: BuildContextInput): CompactContextPackage {
  const maxFacts = input.maxFacts ?? DEFAULT_MAX_FACTS;
  const maxSummaryChars = input.maxSummaryChars ?? DEFAULT_MAX_SUMMARY_CHARS;
  const maxTokensHint = input.maxTokensHint ?? DEFAULT_MAX_TOKENS_HINT;

  const factEntries = Object.entries(input.facts).slice(0, maxFacts);
  const truncatedSummary =
    input.summary.length > maxSummaryChars
      ? `${input.summary.slice(0, maxSummaryChars)}…`
      : input.summary;

  return {
    taskId: input.taskId,
    taskType: input.taskType,
    summary: truncatedSummary,
    facts: Object.fromEntries(factEntries),
    relevantRecordIds: [...new Set(input.relevantRecordIds)],
    maxTokensHint,
  };
}

export function estimateContextTokens(context: CompactContextPackage): number {
  const factsChars = JSON.stringify(context.facts).length;
  const idsChars = context.relevantRecordIds.join(',').length;
  const totalChars = context.summary.length + factsChars + idsChars;
  // Rough, deterministic estimator (~4 chars/token) — avoids calling a
  // provider just to count tokens for a budget pre-check.
  return Math.ceil(totalChars / 4);
}
