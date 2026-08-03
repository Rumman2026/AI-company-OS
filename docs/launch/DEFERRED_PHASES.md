# Deferred Phases

Status: explicitly out of scope for this launch sprint, by the sprint's
own instructions. Recorded here so future work doesn't silently drift
into them without a fresh, explicit decision.

- Connecting every AI provider (only Z.AI/GLM is pilot-prepared; OpenAI,
  Anthropic API, Gemini, DeepSeek, Perplexity, Kimi remain unconnected).
- Full Emma voice assistant.
- Full Jervis executive interface (only a placeholder `apps/jervis-api`
  control-plane scaffold exists from a prior stage).
- Automated mass outreach.
- Autonomous pricing.
- Autonomous estimate approval.
- Automatic production merging by any agent (structurally blocked —
  `packages/policy-engine`'s `checkAuthority()`).
- A fully autonomous "future website factory."
- Live-money trading, brokerage/exchange integration, options trading,
  cryptocurrency trading, sports betting — **Quant Trading OS remains a
  permanently separate repository, deployment, credential set, database,
  and risk boundary** (ADR-0002). Nothing in this sprint touches it.
- Unrelated business websites (GreenCal Mobile Detailing, Navarro
  Builders) — no dedicated module exists for either yet (BUSINESSES.md).

None of the above blocked GreenCal's revenue-producing launch path this
sprint.
