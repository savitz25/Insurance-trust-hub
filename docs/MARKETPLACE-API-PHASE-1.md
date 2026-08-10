# Marketplace API — Phase 1 (shipped)

**Goal:** Secure CMS Marketplace foundation + local landscape in flagship planners.  
**Domain:** insurancetrusthub.com · **Repo:** Insurance-trust-hub

## Endpoints used (CMS)

| Path | Method | Role |
|------|--------|------|
| `/counties/by/zip/{zip}?year=` | GET | County FIPS for ZIP |
| `/plans/search` | POST | Individual market plans for household + place |

Internal routes:

- `POST /api/marketplace/plans` — full plan cards (Plan Explorer)
- `POST /api/marketplace/landscape` — **Phase 1** planner landscape summary

## Files added / key changes

| Path | Change |
|------|--------|
| `lib/marketplace/errors.ts` | Structured errors + log sanitization |
| `lib/marketplace/plans-search.ts` | Landscape aggregates (Bronze/Silver/Gold, spreads, issuers) |
| `lib/marketplace/README.md` | Ops / compliance notes |
| `lib/marketplace/client.ts` | Timeouts + retries/backoff on 429/5xx/timeout |
| `lib/tools/apply-marketplace-landscape.ts` | Merge live landscape into cost + subsidy planner results |
| `app/api/marketplace/landscape/route.ts` | Server-only landscape API |
| `components/marketplace/marketplace-honesty-banner.tsx` | Required honesty layer |
| `components/tools/cost-coverage-planner.tsx` | Fetch landscape on results |
| `components/calculators/aca-coverage-savings-planner.tsx` | Fetch landscape on results |

Env: `MARKETPLACE_API_KEY` (server-only on Vercel). Optional `MARKETPLACE_API_BASE`.

## How planners changed

### Cost & Coverage Planner (`/tools/cost-estimator`)

1. Still runs educational model (FPL, utilization OOP share, path recommendation).
2. On results step, calls `/api/marketplace/landscape`.
3. If `ok`, anchors metal-path **gross premiums** (and deductible/MOOP bands when present) to **lowest local CMS plans** per metal.
4. If fail / missing key, keeps educational baselines + honest fallback notice.

### ACA Coverage & Savings Planner (`/calculators/aca-subsidy`)

1. Keeps FPL / cliff / CSR education.
2. On results, uses local Silver landscape as educational benchmark stand-in for PTC math when available.
3. Bronze/Silver/Gold path nets use local lowest metal premiums after educational credit.

## Fallback behavior

| Condition | Behavior |
|-----------|----------|
| No `MARKETPLACE_API_KEY` | `ok: false`, educational baselines, no invented plans |
| Invalid ZIP | 400 / invalid_zip message |
| Timeout / 5xx / 429 | Retries (client), then fail closed → educational fallback |
| Empty market | Fail closed with CMS message |

## Example test (summary only)

With a valid South Florida ZIP (e.g. Miami-Dade area), a successful landscape response includes:

- `planCount` > 0, `issuerCount` > 0  
- `bronze.lowestPremiumMonthly`, `silver.*`, optional `gold.*`  
- `silverBenchmarkMonthly` for educational PTC context  
- `retrievedAt` + `planYear` (2026 default)  

Exact dollar amounts vary by year/household and should be verified on HealthCare.gov.

## Phase 2 next (payload quality)

- Plan detail cards for lowest / balanced / protected paths (already partially in Plan Explorer)
- Reusable market snapshot component on county pages
- Drug/doctor research only if coverage match quality stays solid
- Do **not** invent network adequacy claims

## Compliance

No enrollment, no lead gates, no “your official subsidy is $X” language — educational estimates only + HealthCare.gov CTA.
