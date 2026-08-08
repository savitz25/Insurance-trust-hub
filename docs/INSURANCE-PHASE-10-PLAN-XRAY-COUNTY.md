# Insurance Trust Hub — Phase 10: Plan X-Ray + County ACA Intelligence

**Date:** 2026-08-08

## Routes

| Surface | Path |
|---------|------|
| Marketplace hub | `/marketplace` |
| Plan X-Ray | `/marketplace/plans/[year]/[planId]?zip=` |
| County intelligence | `/marketplace/[state]/[county]` |

Canonical county pattern: **`/marketplace/{state}/{county}`** (e.g. `/marketplace/fl/miami-dade`).

## Plan X-Ray

- Durable shareable URL from Explorer (“Plan X-Ray”)
- Loads CMS `GET /plans/{id}` + optional market-priced enrichment via plans/search when `zip` present
- Sections: at a glance, cost picture, coverage match pointer, benefits when CMS provides, limitations, sources
- Actions: Explorer, county link when known, save snapshot, HealthCare.gov
- **Indexable** only when durable identity + useful attributes; else `noindex`

## County ACA intelligence

- **Curated markets only** (`lib/marketplace/curated-markets.ts`) — no mass US county generation
- Aggregates from live plan search on sample ZIP (issuers, metal/type mix, premium ranges, deductible/MOOP, HSA count, quality avg)
- Fail closed / thin stub when empty
- **Indexable** when `planCount ≥ 5` and `issuerCount ≥ 2`
- Primary CTA → Plan Explorer prefilled (`?zip=&year=&from=county`)

## Indexation / sitemap

- Sitemap: `/marketplace` + curated FL/TX/AZ county paths (not every US county)
- Plan X-Ray: **not** mass-listed in sitemap (dynamic IDs)
- Page-level `noIndex` when quality gates fail

## Explorer integration

- Card CTA: Quick detail (modal) + **Plan X-Ray** (page)
- Results location line → county intelligence when market matches curated list
- Prefill ZIP/year from query string (county CTA)

## Modules

| File | Role |
|------|------|
| `lib/marketplace/curated-markets.ts` | Market registry + paths |
| `lib/marketplace/plan-xray.ts` | Plan loader |
| `lib/marketplace/county-intelligence.ts` | Aggregates |
| `components/marketplace/plan-xray-view.tsx` | UI |
| `components/marketplace/county-intelligence-view.tsx` | UI |

## Trust

Research only · no lead forms · no paid placements · no invented stats · confirm on HealthCare.gov · You decide.

## Next hooks

- My Insurance cross-device wallet of saved X-Ray snapshots
- Expand curated counties only when CMS data is differentiated
- Optional state-based exchange notes for non-federal markets
