# Massachusetts DOI Agency Inventory (Phase 23)

Agencies / **business entities** only on the public directory. Individuals may be staged.  
Licensed **companies, carriers, and reinsurers are never promoted as agencies**.  
Phase 1 `resolveProviderTrustState` → `verified` required before public promote.  
FL / TX / OH / NV / NC / VT pipelines are unchanged. Lead forms stay off for MA.

## Official source

[Massachusetts licensed individuals and business entities](https://www.mass.gov/lists/massachusetts-licensed-individuals-and-business-entities)

Regulator: **Massachusetts Division of Insurance (MA DOI)**  
Consumer re-check: [NAIC SBS MA lookup](https://sbs.naic.org/solar-external-lookup/lookup/licensee?jurisdiction=MA)

## File on disk (this wave)

`data/ma-raw/Mass_licensed_companies.csv` (gitignored; August 3, 2026 dump)

This file is **not** a producer-agency list. Header block:

> Licensed Or Approved Companies with Pharmacy Managers

Real columns (after an 11-row preamble): `Company Type`, `NAIC #`, `Company`, `Address`, `City`, `State`, `Zip`, `Phone`.

Rows are insurance companies, HMOs, TPAs, surplus lines, and reinsurers — **2,696** rows on the 3 Aug 2026 dump, all `licensed_company`. The import pipeline parses the preamble, maps those columns, and **fail-closes every row** with `carrier_company_not_agency`. Nothing from this file is staged as an agency or promoted.

Largest company-type buckets: Property & Casualty 850 · Life, Accident & Health 392 · Third Party Administrator 365 · Risk Purchasing Group 269 · Surplus Lines 207 · Service Contract Providers 128 · Risk Retention Group 117. Accredited Reinsurer 65. Health Maintenance Organization 24.

Wave-1 public inventory stays **empty** until the official Mass.gov **agency / business-entity** XLS/CSV files are placed in `data/ma-raw/` and imported.

## Firm vs individual vs carrier

Fail-closed:

- **Firm** if the name matches LLC / Inc / Agency / Insurance / Corp / LLP / PC / Company / Group / Services.
- Named first+last without a firm suffix = **individual** (not promoted).
- Appraiser / public adjuster classes are never default-promoted.
- Any licensed-company record (header `Company Type` + `NAIC`, filename `*licensed*compan*`, or carrier-type string such as reinsurer / insurer / HMO) is **never** promote-eligible.

Medicare-certified status is never inferred from MA DOI data alone.

## Out-of-state HQ

Promote and hub-place only Massachusetts street addresses. Texas (or any non-MA) headquarters do not appear on Boston / Worcester / Springfield hubs.

## Wave 1 launch markets

| Market id | Display | Hub | Cap |
|-----------|---------|-----|-----:|
| `boston` | Greater Boston / Suffolk | `/hubs/massachusetts/boston` | 400 |
| `worcester` | Worcester | `/hubs/massachusetts/worcester` | 200 |
| `springfield` | Springfield / Hampden | `/hubs/massachusetts/springfield` | 200 |

Matching: city first, then ZIP prefix `021`/`022`, `016`, `011`/`010`. Excel often drops the leading zero on Massachusetts ZIPs (`2108` → `02108`). County is labeled from a documented city map when the source file has no county.

Empty hubs stay empty.

## Commands

```bash
npm run check:phase23-ma
npm run ma:import -- --file data/ma-raw/Mass_licensed_companies.csv --dry-run
npm run ma:import -- --file scripts/ma/fixtures/ma-agencies-sample.csv --dry-run
npm run ma:import -- --dir data/ma-raw --firms-only --launch-markets-only --dry-run
npm run ma:import -- --file data/ma-raw/<agency-list>.xlsx --firms-only --confirm
npm run ma:promote -- --dry-run
npm run ma:promote -- --market boston --confirm
```

Writes require `--dry-run` or `--confirm`.

Apply `supabase/migrations/20260819120000_massachusetts_doi_inventory.sql` before a live import.

## Residual risk

Until the official agency/business-entity lists are ingested, directory and homepage MA chips stay hidden (`maTotal > 0`). Hubs render honest empty inventory. Do not treat the licensed-companies dump as a shortcut to Wave-1 density.
