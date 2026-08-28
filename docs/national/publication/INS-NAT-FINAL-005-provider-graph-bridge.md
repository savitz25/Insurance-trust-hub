# INS-NAT-FINAL-005 — Provider → graph publication bridge

Library: `lib/national/provider-graph-bridge.ts`  
Table: `provider_entity_bridges` (existing; unique on `provider_id`)

## Semantics

PUBLIC PROVIDER RECORD → REPRESENTS → CANONICAL AGENCY ENTITY

This is a **publication bridge**. It is not a second agency identity. Unresolved public providers stay public.

## Match

CONFIRMED production writes require:

- exact NPN on the public provider (`license_info.licenses[].npn` or `NPN 12345` in notes)
- exact NPN on exactly one graph `agency`
- no other public provider sharing that NPN

Name, address, phone, email, website, and brand are never bridge keys.

## Classification

| Decision | Confidence | Production write |
|----------|------------|------------------|
| 1:1 exact NPN | CONFIRMED | yes |
| multiple graph agencies same NPN | REVIEW_REQUIRED | no |
| multiple public providers same NPN | REVIEW_REQUIRED | no |
| missing NPN / no graph agency | UNRESOLVED | no |

## Agency publication readiness

Classified for all graph agencies. **Not an index trigger.**

- `READY_FOR_PUBLIC_PROFILE` — CONFIRMED identity, unique NPN, official credential identity
- `INTERNAL_ONLY` — identity not CONFIRMED
- `REVIEW_REQUIRED` — collision or review identity
- `NOT_READY` — missing NPN / credential

Public graph agencies published this task: **0**. Existing provider pages may load the Trust Report only through a CONFIRMED bridge.

## Routes

| Current | Future | This task |
|---------|--------|-----------|
| `/providers/[slug]` | possible `/agencies/{npn}` later | keep current; no SEO migration |
| no person directory | verification-first only | unchanged |
| no legal-insurer pages | optional later | INTERNAL_ONLY |

Canonical URL redirects are deferred. Collision risk: same NPN on two providers stays REVIEW_REQUIRED, no public bridge.

## Legacy providers

The 170,499 public providers remain. Do not mass-delete. Goal: one public agency identity backed by one canonical graph agency with many credentials. This task only writes CONFIRMED 1:1 NPN bridges.
