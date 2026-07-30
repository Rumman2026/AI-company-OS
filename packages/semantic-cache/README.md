# Semantic Cache Package

Response caching for the AI gateway/task-router: exact-response caching
where appropriate, keyed on a normalized (trimmed, lowercased,
whitespace-collapsed) string.

**Phase 1 scope**: `NormalizedKeyCache` implements exact/normalized-key
matching only. True embedding-based semantic similarity matching (finding
_similar_, not identical, prior requests) is a documented future
enhancement — not implemented here, to avoid presenting an unimplemented
capability as working. In-memory only; a Redis-backed implementation on
the Hostinger VPS is future work (see
[docs/cloud/CLOUD_ARCHITECTURE.md](../../docs/cloud/CLOUD_ARCHITECTURE.md)).

New, non-duplicating package — see [DECISIONS.md](../../DECISIONS.md)
ADR-0008.
