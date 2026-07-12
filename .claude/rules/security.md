---
paths:
  - 'infra/secrets/**'
  - 'infra/iam/**'
  - 'config/policies/**'
  - 'config/env/**'
  - '.env.example'
---

# Security rule

Scope: secret-management planning (`infra/secrets`), IAM planning
(`infra/iam`), governance/policy planning (`config/policies`), and
environment variable templates (`config/env`, root `.env.example`).

- `infra/secrets` and `infra/iam` currently contain only planning
  `README.md` files — no real IAM policies or secret stores exist in this
  repository. Do not add real credentials, keys, tokens, or secret values
  to any file in this repository, including these directories.
- The never-commit vs. may-commit-after-verification distinction for
  environment files is defined once in root [CLAUDE.md](../../CLAUDE.md)
  ("Security and Git boundaries") — this rule does not repeat it. Both
  `config/env/.env.example` and the root `.env.example` are sanitized
  templates: keep them limited to variable _names_ and non-sensitive
  example values, never real values.
- Treat any change under these paths as security-relevant: prefer the
  smallest change, avoid inventing an IAM/secrets architecture that isn't
  already decided (see [DECISIONS.md](../../DECISIONS.md)), and flag to
  the user rather than guessing when a change would affect access control
  or credential handling.
- Changes here that would modify real access controls, provision real
  secrets storage, or affect production systems require explicit user
  authorization per root [CLAUDE.md](../../CLAUDE.md) — this rule does
  not grant that authorization.
