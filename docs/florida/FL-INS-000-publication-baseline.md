# FL-INS-000 — Florida publication baseline

**No publication changes in this task.**

## Gates (unchanged)

| Gate | Value |
|------|-------|
| `PUBLIC_PERSON_PROFILES_ENABLED` | false |
| `PUBLIC_REGULATORY_EVIDENCE_ENABLED` | false |
| Legal insurer / group / brand / carrier pages | INTERNAL_ONLY |
| Public graph agencies | 0 |
| Public people | 0 |
| Sitemap | unchanged (no people, no 82k agencies) |
| Robots | unchanged |
| New indexed routes | none (`/florida` Intelligence is design-only) |

## Current public surface

| Object | Count |
|--------|------:|
| Public `providers` | 170,499 |
| DFS staged business producers | 98,622 |
| DFS promotions | 98,622 |
| CONFIRMED provider→graph bridges (national) | 37,515 |
| Trust Report | `insurance-agency-trust-report-v1` on CONFIRMED exact-NPN bridges only |

Public providers with `states_licensed` containing FL: **98,622** (all `verified=true`). Matches `dfs_producers` business staging / promotions. Do not mass-index graph agencies.

## Readiness classes (classification, not index)

| Class | Meaning |
|-------|---------|
| READY_FOR_PROFILE_ENRICHMENT | Existing public provider + CONFIRMED exact-NPN graph bridge + agency CONFIRMED + ≥1 FL credential |
| INTERNAL_ONLY | Graph entity without public provider, or legal insurer/appointer/person |
| REVIEW_REQUIRED | NPN collision, digit-coincidence appointer, name-only CRN |
| NOT_READY | Missing NPN or credential |

People remain verification-first. Legal insurers remain INTERNAL_ONLY through Florida carrier work until an explicit later task.

## County appointment

County appointment ≠ “authorized to write Miami-Dade.” Nonresident personal-solicitation rule. No county pages in this task.
