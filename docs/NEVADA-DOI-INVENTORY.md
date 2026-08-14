# Nevada DOI Firm Inventory (Phase 14 / NV-1)

Firms / **agencies** only. Do **not** bulk-promote individual producer lists.  
Phase 1 `resolveProviderTrustState` → `verified` required before public promote.  
FL / TX / OH / MS pipelines are unchanged.

## Product rule

Directory membership = **the license jurisdiction we can prove**.

- A firm with an NV DOI firm license belongs in `/directory?state=NV`
- Non-resident firms licensed in NV **do** belong in the NV directory
- Home office in CA / TX / NC / etc. is **address metadata only**
- We **never** create a verified listing in the home state from this NV file
- Local hubs (Las Vegas, Reno, Carson City) still require an **NV street address** plus city/ZIP match

## Download

1. Open [NV DOI reports and lookups](https://di.nv.gov/nv/r/doi/reports-and-lookups/home).
2. Export **Firms by License Type** and optionally **non-resident firms by qualification**.
3. Save under `data/nv-raw/` (gitignored except README).

Official regulator: **Nevada Division of Insurance (NV DOI)**  
Consumer re-check: [NAIC SBS NV lookup](https://sbs.naic.org/solar-external-lookup/lookup/licensee?jurisdiction=NV).

## Files used (this wave)

| File | Role |
|------|------|
| `nv_raw_Firms_License.xlsx` | Firms by license type (section headers) |
| `nv_raw-firms_License_type.csv` | Same export as CSV (legacy) |
| `nv_raw_non-resident_firms_qualification.xlsx` | LOA / qualification sections for non-resident firms |
| `nv_raw_resident_producer_list.xlsx` | **Skipped** — individuals |
| `nv_raw_non-resident_producer_list.xlsx` | **Skipped** — individuals |
| `Resident_Producer_List.xlsx` | **Skipped** — individuals |

### Columns mapped (Firms by License Type)

`License`, `Name`, `Address`, `City`, `State`, `Zip`, `Phone`, `Email`, `Original Issue Date`, `Expiration Date`

Section header: `Firm License Type : Resident Producer Firm`

`State` is the firm’s **physical HQ**, not a second license jurisdiction. The whole file is NV DOI.

### Columns mapped (Firms by Qualification)

Same identity/address columns. Date order is **expiration then original issue**.  
Section header: `Qualification : Casualty` (also Life, Property, etc.)

Qualifications merge onto the same `AGENCY`/license number. They never become a home-state license.

## Firm-type promote policy

**Stage** consumer-facing and non-consumer types (adjusters, TPA, ERO stay staged).

**Promote** (NV directory) when:

1. Firm/agency type is producer / surplus / title / MGA / consultant
2. Active / unexpired
3. License number present
4. Phase 1 trust state `verified`
5. Identity match accepted

**Not default-promoted:** Independent Adjuster, External Review Organization, TPA, Utilization Review, service contracts, bail, funeral, cemetery, motor club, appraisers, viatical, reinsurance intermediaries.

## Residency

| Detected from | Stored as |
|---|---|
| Firm type contains `Non-Resident`, or HQ state ≠ NV | `residency: non_resident` |
| Otherwise | `residency: resident` |
| HQ state when ≠ NV | `home_address_state` (metadata only) |

Public copy for non-residents: **NV-licensed (non-resident)** plus home-office state if known. Profiles say that address is not a verified home-state license.

## Wave 1 launch markets (hubs)

| Market id | Display | Hub | Cap |
|-----------|---------|-----|----:|
| `las-vegas` | Las Vegas / Clark (includes Henderson) | `/hubs/nevada/las-vegas` | 2000 |
| `reno` | Reno / Washoe (includes Sparks) | `/hubs/nevada/reno` | 1500 |
| `carson-city` | Carson City | `/hubs/nevada/carson-city` | 400 |
| `statewide` | NV-licensed remainder (other NV cities + non-residents) | directory only | 20000 |

Matching for hubs: **city first**, then ZIP prefix `891` / `895` / `897`. Out-of-state HQ never gets a city hub. Pahrump is not Las Vegas.

## Commands

```bash
npm run check:phase14-nv
npm run nv:import-firms -- --file scripts/nv/fixtures/nv-firms-sample.csv --dry-run
npm run nv:import-firms -- --dir data/nv-raw --dry-run
npm run nv:import-firms -- --dir data/nv-raw --confirm
npm run nv:promote -- --dry-run --metro las-vegas --limit 20
npm run nv:promote -- --metro all --confirm
```

`--metro` accepts `las-vegas|reno|carson-city|remainder|all`. Writes require `--dry-run` or `--confirm`.

Apply `supabase/migrations/20260816120000_nevada_doi_inventory.sql` if `nv_producers` is missing.

## Refresh

1. Re-download firm files into `data/nv-raw/`.
2. `nv:import-firms --dir data/nv-raw --confirm`
3. `nv:promote --metro all --confirm` (`--skip-existing` is the default)
4. QA `/directory?state=NV&verified=true`, Las Vegas / Reno hubs, one resident and one non-resident profile.
