# Insurance Trust Hub — Phase 8: Doctor Network + Prescription Coverage

**Date:** 2026-08-08  
**Primary route:** `/tools/aca-plan-explorer`  
**APIs:**  
- `POST /api/marketplace/providers/search`  
- `POST /api/marketplace/drugs/search`  
- `POST /api/marketplace/coverage`

## Product

Extends Phase 7 Plan Explorer so consumers can research:

1. Whether doctors / facilities are **reported in-network** for candidate plans  
2. Whether prescriptions are **reported covered** on Marketplace formulary data  

Secondary entry points from Tools quick links (`#doctors`, `#prescriptions`). Not a standalone lead funnel.

**Not:** enrollment, lead gates, invented matches, tier/PA fabrication, agency-directory enrichment.

## Flow

```text
ACA Plan Explorer results
  → add doctors (CMS search or NPI)
  → add prescriptions (CMS drug search)
  → plan cards update with match summary
  → plan detail shows per-item breakdown + limitations
  → optional save snapshot (includes doctor/drug lists) to My Insurance
```

Explorer still works with **zero** doctors/drugs.

## Data layer

| Module | Role |
|--------|------|
| `lib/marketplace/coverage.ts` | CMS providers/search, drugs/autocomplete, providers/covered, drugs/covered |
| `lib/marketplace/analytics.ts` | Lightweight dataLayer research events |
| `lib/marketplace/types.ts` | Session doctor/Rx + match status types |
| API routes under `app/api/marketplace/` | Server-only; key never client-exposed |

### CMS endpoints used

- `GET /providers/search` (+ autocomplete fallback)  
- `GET /providers/covered?providerids=&planids=&year=`  
- `GET /drugs/autocomplete` (+ search fallback)  
- `GET /drugs/covered?drugs=&planids=&year=`  

### Match states (fail closed)

| CMS `coverage` | UI status |
|----------------|-----------|
| Covered | `reported` |
| GenericCovered | `generic_reported` |
| NotCovered | `not_reported` |
| DataNotProvided / missing row / API failure | `unknown` or `insufficient_data` |

Never invent Covered/in-network when the API is empty or errors.

### Provenance

- `sourceSystem`, plan year, `retrievedAt` on match payload  
- Plan detail shows source + as-of  
- Optional explainable ratio: `reported / (reported + not_reported)` — **unknown excluded**

## Trust copy

Visible framing includes:

- Research tool based on Marketplace-reported network/formulary data  
- Not medical, eligibility, or coverage advice  
- Networks and formularies change  
- Confirm with issuer / HealthCare.gov  
- No paid placements in ranking  
- “What this does not mean” in plan detail  

## Measurement events

`ith_marketplace_*` via `dataLayer` when present:

- `doctor_added`, `doctor_match_run`  
- `prescription_added`, `prescription_match_run`  
- `plan_detail_with_match`  
- `save_doctors_drugs_workspace`  
- `confirm_official_source_click`  

## Env

Same as Phase 7:

```bash
MARKETPLACE_API_KEY=
# optional MARKETPLACE_API_BASE=https://marketplace.api.healthcare.gov/api/v1
```

## QA checklist

- [x] Explorer works with zero doctors/drugs  
- [x] Adding doctors updates plan signals (when API + plans available)  
- [x] Adding drugs updates plan signals  
- [x] Unknown states render clearly  
- [x] No matches invented on API failure  
- [x] Mobile-usable cards + detail sheet  
- [x] No lead form gate  
- [x] Provenance/limitations visible  
- [x] Does not depend on agency seed directory  

## Later hooks (not this ship)

- Total-cost / OOP utilization engine combining premiums + expected Rx + care  
- Richer formulary restriction fields **only if** CMS returns them  
- Persistent household care profile beyond session snapshot  
