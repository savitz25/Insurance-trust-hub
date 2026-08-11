# Provider Trust State (Phase 1)

Single source of truth for consumer-facing agency trust language on InsuranceTrustHub.

**Module:** `lib/insurance/trust/provider-trust-state.ts`

## Public states only

| State | Consumer meaning | Directory / cards | Profile page |
|-------|------------------|-------------------|--------------|
| `verified` | Meets public research standard | May list + verified badge | Full profile |
| `pending_verification` | Real candidate, incomplete gates | **Omit** (default) | Not found / unavailable |
| `unavailable` | Seed, invalid, or not consumer-safe | **Omit** | Not found |

No hybrid states. No `seed` state in consumer UI.

## Required signals for `verified`

All of the following must be true (same gates as Phase 6B1 promotion → `indexable_research` + hard verified badge):

1. **Non-seed entity id** — not `fallback-*`, `seed-*`, or `*-agent-*`
2. **Re-checkable license number** — passes `cleanLicenseNumber` (digits; not “FL-DFS Active ✅” style strings)
3. **License state** — 2-letter jurisdiction on the record
4. **Regulator / source name** — `license_source` present
5. **Fresh check timestamp** — `license_checked_at` within 365 days
6. **Identity match accepted** — `license_identity_match_accepted === true`
7. **Verified promote flag** — `is_verified === true`

If any gate fails:

- seed / synthetic id → `unavailable`
- incomplete real record → `pending_verification`
- never → `verified`

## Hub agents

Curated/generated hub agents **never** resolve to `verified` in this module. They lack full provenance fields until backfilled into the providers table with promotion gates. Product default: show **verified only** in markets → empty honest state until DB inventory exists.

## Counts

Use `countVerified(records)` / `filterVerifiedProviders` / `filterVerifiedHubAgents` only.

- If count is 0: honest “still verifying / no verified listings yet” copy
- Empty markets: `noindex, follow` via `buildMarketMetadata` / `buildHubMetadata`

## Internal-only concepts (never consumer copy)

- illustrative seed
- score suppressed (seed/incomplete)
- listing class `seed`
- operator promotion digests

## QA checklist

- [ ] `/hubs/florida/jacksonville` — no “12 verified” unless 12 verified cards; empty → noindex
- [ ] `/hubs/florida/tampa` — same
- [ ] `/directory` — only verified rows; empty honest
- [ ] `/providers/siegel-insurance-inc-atlanta` — 404 fail-closed (not 500)
- [ ] One known verified DB profile (if any) — 200 + verified badge
- [ ] `/tools/marketplace-plan-research` — still healthy
- [ ] No “illustrative seed” / “Score suppressed” in consumer HTML
- [ ] `npm run check:phase1-trust` passes

## Regression

```bash
npm run check:phase1-trust
```
