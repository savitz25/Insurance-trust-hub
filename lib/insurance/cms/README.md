# CMS data integration (Phase 1) — InsuranceTrustHub

Standalone deploy: **https://www.insurancetrusthub.com**  
Repo: `savitz25/Insurance-trust-hub` (Vercel project for this domain only).

## Deliverables

1. **Plan Complaint Index** — `/data/plan-complaint-index`  
   Real rankings from `data/complaint-rankings.json` (CMS 2026 Star Ratings C28/D02).

2. **Government Verification Panel** — provider profiles  
   PPEF / Opt Out via `ppef-lookup.ts` when NPI is present; honest pending states otherwise.

3. **Trust Score · Government Standing** — neutral when CMS data missing.

## Processed data (committed)

| File | Purpose |
|------|---------|
| `data/complaint-rankings.json` | National / FL / TX rankings + byContractId |
| `data/opt-out-npis.json` | CMS Opt Out Affidavit NPIs (~56k) |
| `data/ppef-meta.json` | PPEF extract provenance |

Optional (gitignored, large): `data/ppef-active-npis.json` from `scripts/import-cms-ppef-index.mjs`.

## Refresh

```bash
# From this repo after re-downloading cms-data/
set CMS_DATA_ROOT=./cms-data
node scripts/import-cms-complaint-rankings.mjs
node scripts/import-cms-opt-out.mjs
# optional: node scripts/import-cms-ppef-index.mjs
```

## Canonical URLs

- Plan Complaint Index: `https://www.insurancetrusthub.com/data/plan-complaint-index`
- Legacy `/insurance/*` → apex via `vercel.json` 301s
