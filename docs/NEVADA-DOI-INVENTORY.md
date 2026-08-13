# Nevada DOI Firm Inventory (Phase 14)

Firms / **agencies** only. Do **not** use `Resident_Producer_List` (individuals) in this phase.  
Phase 1 `resolveProviderTrustState` → `verified` required before public promote.  
FL / TX / OH / NC pipelines are unchanged.

## Download

1. Open [NV DOI reports and lookups](https://di.nv.gov/nv/r/doi/reports-and-lookups/home).
2. Choose **Firms by License Type** (not the resident producer / individual list).
3. Save as `data/nv-raw/nv_raw-firms_License_type.xlsx` (or export/save as CSV).
4. Files in `data/nv-raw/` are gitignored except the README.

Official regulator name: **Nevada Division of Insurance (NV DOI)**.  
Consumer re-check: [NAIC SBS NV lookup](https://sbs.naic.org/solar-external-lookup/lookup/licensee?jurisdiction=NV).

## Section-header parsing

The workbook is **not** a flat table. It groups firms under header rows:

```text
Firm License Type : External Review Organization
…data rows…
Firm License Type : Independent Adjuster
…data rows…
Firm License Type : Resident Producer Firm
```

Importer (`lib/nv/parse-workbook.ts`):

- Detects rows that start with `Firm License Type`
- Applies that type to following data rows until the next section header
- Skips blank rows and the `License,Name,Address…` column header
- Supports **CSV and XLSX** (XLSX needs the `xlsx` package; CSV works without it)
- Reads every sheet if the file is a workbook

The original firm license type string is stored on `nv_producers.firm_license_type`.

## Live file snapshot (this phase)

Source: `data/nv-raw/nv_raw-firms_License_type.csv` (converted from the official firms workbook).

| | Count |
|---|---|
| Parsed firm rows | 19,880 |
| NV physical address | 2,184 |
| Out-of-state HQ | 17,694 |
| Phone present | 19,573 |
| Email present | 18,849 |

Largest types:

| Firm license type | Total | NV address |
|---|---:|---:|
| Non-Resident Producer Firm | 14,983 | 17 |
| Resident Producer Firm | 1,965 | 1,826 |
| Non-Resident Surplus Lines Broker | 1,160 | 1 |
| Non-Resident Third Party Administrator | 399 | 2 |
| Independent Adjuster | 338 | 7 |
| Service Contract Provider | 271 | 5 |
| Utilization Review | 159 | 16 |
| Resident Surplus Lines Broker | 87 | 71 |
| Public Adjuster | 72 | 13 |
| Resident Title Agency | 66 | 41 |

Top NV cities: Las Vegas 1,244 · Henderson 299 · Reno 289 · Sparks 51 · North Las Vegas 49 · Carson City 38.

## Firm-type promote policy

**Stage everything** (including adjusters, ERO, TPA, utilization review).

**Default promote** only these consumer-facing types, and only when the **physical address state is NV**:

- Resident Producer Firm
- Non-Resident Producer Firm *(only the handful with an NV street address)*
- Resident / Non-Resident Surplus Lines Broker *(NV address)*
- Resident / Non-Resident Managing General Agency *(NV address)*
- Resident / Non-Resident Title Agency *(NV address)*
- Resident Insurance Consultant

**Not default-promoted** (honest staging only): Independent Adjuster, External Review Organization, TPA, Utilization Review, Service Contract Provider, bail / funeral / cemetery / motor club / appraisers, viatical, reinsurance intermediaries.

Rationale: ~15k Non-Resident Producer Firms are CA/FL/TX headquarters licensed in Nevada. Dumping them into `/directory?state=NV` would bury local agencies. They remain in `nv_producers` for a later statewide-nonresident mode if we ever want it.

## Out-of-state HQ rule

The `State` column is the firm’s **physical HQ**, not “licensed in NV” (the whole file is NV DOI).

| Surface | Rule |
|---|---|
| Staging | All NV DOI firms |
| Local hubs | `State=NV` **and** city/ZIP launch-market match |
| `/directory?state=NV` | Same promoted set (NV-addressed consumer types). `states_licensed=['NV']` |

Henderson maps into the Las Vegas / Clark hub. Pahrump (Nye, ZIP 89048) is **not** treated as Las Vegas.

## Wave 1 launch markets

| Market id | Display | Hub | Cap |
|-----------|---------|-----|-----|
| `las-vegas` | Las Vegas / Clark (includes Henderson) | `/hubs/nevada/las-vegas` | 2000 |
| `reno` | Reno / Washoe (includes Sparks) | `/hubs/nevada/reno` | 1500 |
| `carson-city` | Carson City | `/hubs/nevada/carson-city` | 400 |

Matching: **city list first**, then ZIP 3-digit prefix (`891` / `895` / `897` only). ZIP `890` is not used as a Las Vegas prefix because it includes Nye County.

## Commands

```bash
npm run check:phase14-nv
npm run nv:import -- --file scripts/nv/fixtures/nv-firms-sample.csv --dry-run
npm run nv:import -- --file data/nv-raw/nv_raw-firms_License_type.csv --dry-run
npm run nv:import -- --file data/nv-raw/nv_raw-firms_License_type.csv --launch-markets-only
npm run nv:promote -- --dry-run
npm run nv:promote -- --market las-vegas --limit 50 --skip-existing
npm run nv:promote -- --market reno --skip-existing
npm run nv:promote -- --market carson-city --skip-existing
# or
npm run nv:promote -- --market all --skip-existing
```

Apply `supabase/migrations/20260816120000_nevada_doi_inventory.sql` before a live import.

XLSX: `npm install xlsx` then `--file data/nv-raw/nv_raw-firms_License_type.xlsx`. CSV works without that package.

## Refresh path

1. Re-download Firms by License Type from the NV DOI reports page.
2. Replace `data/nv-raw/nv_raw-firms_License_type.csv` (or `.xlsx`).
3. Re-import, then `nv:promote --market all --skip-existing`.
4. Spot-check `/directory?state=NV&verified=true` and Las Vegas / Reno hubs.
5. Re-check a sample license on the official SBS lookup.

Directory chip **Nevada (NV DOI)** appears only when verified NV count &gt; 0.
