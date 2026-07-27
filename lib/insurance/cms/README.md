# CMS data integration (Phase 1)

Government-backed trust signals for **Insurance Trust Hub** (`https://www.insurancetrusthub.com`).

Canonical repo: `https://github.com/savitz25/Insurance-trust-hub`  
Vercel project: `insurance-trust-hub`

Routes (apex domain, not nested under `/insurance`):
- Plan Complaint Index: `/data/plan-complaint-index`
- Provider profiles: `/providers/[slug]` (Government Verification panel)

## Deliverables

1. **Government Verification Panel** — `components/insurance/cms/government-verification-panel.tsx`  
   Props: `GovernmentVerificationData` (`types.ts`). Resolved from providers via `resolve-government-verification.ts`. Never invents NPI.

2. **Plan Complaint Index** — `/insurance/data/plan-complaint-index`  
   Rankings from `complaint-rankings.ts`. Seed rows are `isPlaceholder: true` until CMS public file import.

3. **Trust Score · Government Standing** — `government-standing.ts` + `enrichment/trust-score.ts`  
   Neutral when CMS data missing. Breakdown UI in `trust-score-breakdown.tsx`.

## CMS import fields (complaint rates)

| Field | Description |
|-------|-------------|
| `contract_id` | CMS contract ID (e.g. H1234) |
| `organization_name` | Carrier / parent marketing name |
| `complaints_per_1000_enrollees` | CMS complaint rate measure |
| `measurement_year` / vintage | e.g. CY2024 |
| `overall_star_rating` | Optional |
| `state_service_area` | Optional filter |
| `enrollment` | Optional |

Prefer **scheduled public CMS file import** over live restricted APIs. Version with `dataVintage` + `syncedAt` on `CMS_COMPLAINT_DATASET_META`.

## Refresh procedure

1. Download public CMS Part C/D complaint rate file for the target year.
2. Transform to `CmsComplaintRanking[]` (set `isPlaceholder: false`).
3. Update `CMS_COMPLAINT_DATASET_META` vintage + `syncedAt` + `usingPlaceholderData: false`.
4. Deploy. Page UI does not need structural changes.
