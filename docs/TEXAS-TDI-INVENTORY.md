# Texas TDI Agency Inventory (Phase 8)

Agencies / business entities only. No bulk individual producers.  
Phase 1 `resolveProviderTrustState` → `verified` is required before public promote.  
Florida DFS inventory is unchanged.

## Official sources

| Resource | URL |
|----------|-----|
| Agencies & businesses open data | https://data.texas.gov/dataset/Insurance-agencies-and-businesses-approved-to-mana/3yqc-fcdt |
| Socrata resource id | `3yqc-fcdt` |
| CSV download | https://data.texas.gov/api/views/3yqc-fcdt/rows.csv?accessType=DOWNLOAD |
| SODA CSV | https://data.texas.gov/resource/3yqc-fcdt.csv |
| Agent lists index | https://tdi.texas.gov/agent/agentlists.html |
| Consumer lookup | https://www.tdi.texas.gov/agent/index.html |

**Raw files are gitignored** under `data/tdi-raw/` (do not commit multi-MB CSVs).

## Field map (Socrata → staging)

| API / CSV field | Staging column | Notes |
|-----------------|----------------|-------|
| `npn` | `npn` | National producer number |
| `agency_license_number` | `license_number` | Unique key (merged across qualification rows) |
| `org_name` | `legal_name` / `display_name` | Business name |
| `agency_type` | `org_type` | e.g. Corporation, LLC |
| `license_type` | `license_types[]` | Merged set |
| `qualification` | `qualifications[]` | LOA-like; mapped to specialties |
| `license_issue_date` | `issue_date` | |
| `expiration_date` | `expiration_date` | Expired → not promoted |
| `city` | `city` | Primary geo for launch markets |
| `state` | `state` | HQ / home-office state. Blank stays blank (not TX, not non-resident proof). License jurisdiction is always TX. |
| `pstl_cd` | `zip` | First 5 digits |
| `county` | `county` | **Sparse** — mainly title agencies |

Regulator labels on public providers: **Texas Department of Insurance**.

## Qualification → specialty tags

Mapped when possible (never invent Medicare-certified):

- Health · Life · Property & Casualty · Personal Lines · Title · Public Adjuster · Agency

Logic: `lib/tdi/qualifications.ts` (+ reuses `lib/dfs/loa` specialty surface).

## Wave 1 launch markets

| Market id | Display | Hub slug(s) | Cap (Phase 8B) |
|-----------|---------|-------------|----------------|
| `houston` | Houston / Harris | `/hubs/texas/houston` | **3500** |
| `dallas` | Dallas / Dallas County | `/hubs/texas/dallas-fort-worth` | **3500** |
| `fort_worth` | Fort Worth / Tarrant | `/hubs/texas/dallas-fort-worth` | 2000 |
| `austin` | Austin / Travis | `/hubs/texas/austin` | 2000 |
| `san_antonio` | San Antonio / Bexar | `/hubs/texas/san-antonio` | 2000 |

### Cap policy (Phase 8B)

- Caps keep each hub **dense and usable**, not a dump of every residual staged TX agency.
- Houston/Dallas raised **2,500 → 3,500** after first live promote hit the floor while staged residual remained.
- Fort Worth / Austin / San Antonio remain at 2,000 (first pass under-cap).
- **Dallas–Fort Worth hub** is an aggregate of `dallas` + `fort_worth` markets — copy and scope notes say so.
- Residual `tdi_producers` rows stay staged; raise caps + `npm run tdi:promote -- --market houston` (skip-existing) to fill.
- Do **not** promote statewide residual into a single hub.

Matching order: **city list → county aliases → ZIP 3-digit prefix**.  
Documented limitation: many non-title rows have **no county**.

## Schema

Migration: `supabase/migrations/20260812200000_texas_tdi_inventory.sql`

| Table | Access |
|-------|--------|
| `tdi_import_batches` | service_role only (RLS) |
| `tdi_license_raw` | service_role only |
| `tdi_producers` | service_role only |
| `tdi_provider_promotions` | service_role only |
| `providers` (verified) | public read of verified only (existing RLS) |

Apply migration in Supabase SQL Editor or CLI before first live import.

## Commands

See also **[TX-2-DIRECTORY.md](./TX-2-DIRECTORY.md)** (statewide directory vs local hubs).

```powershell
# Preflight (same Supabase service role as DFS ops)
npm run dfs:env
npm run check:phase8-tdi

# 1) Download open data (or save CSV manually to data/tdi-raw/tdi-agencies.csv)
npm run tdi:import -- --download --dry-run

# 2) Dry-run normalize (fixture, no DB)
npm run tdi:import -- --file scripts/tdi/fixtures/tdi-agencies-sample.csv --dry-run

# 3) Full import — TX-licensed agencies, any HQ (writes need --confirm)
npm run tdi:import -- --file data/tdi-raw/tdi-agencies.csv --dry-run
npm run tdi:import -- --file data/tdi-raw/tdi-agencies.csv --confirm

# 4) Directory statewide (skip-existing; does not flood hubs)
npm run tdi:promote -- --scope directory-statewide --dry-run --limit 50
npm run tdi:promote -- --scope directory-statewide --confirm

# 5) Hubs only (TX address + launch metro)
npm run tdi:promote -- --scope launch-metros --market houston --dry-run --limit 25
npm run tdi:promote -- --scope launch-metros --confirm
```

## Consumer surfaces (Phase 8B polish)

- Hubs: `/hubs/texas/houston`, `/hubs/texas/dallas-fort-worth`, `/hubs/texas/austin`, `/hubs/texas/san-antonio`
  - TDI framing, specialty chips (`?loa=`), Showing X of Y pagination, scope notes
  - DFW explicitly aggregates Dallas + Fort Worth markets
- Directory: `/directory?state=TX&verified=true` — first-class TX chip + launch hub nav
- Profiles: research dossier; **Regulator = Texas Department of Insurance (TDI)**; NPN when present in license notes; no Medicare-from-TDI claims

## Limitations

1. **County sparse** — mostly title agencies; metro matching uses city + ZIP.  
2. **One row per qualification** in source — import merges by license number.  
3. **Non-TX HQ** agencies are TX-licensed and belong in `/directory?state=TX` (TX-2). They do **not** appear on Houston/Dallas/etc. hubs. Blank `State` is unknown HQ, not non-resident proof.  
4. **No individuals** in Phase 8.  
5. **No Places / appointments** in Phase 8A.  
6. **Expiration** — expired licenses are not promoted.

## Refresh cadence

Suggested: monthly re-download + import (upsert by license) + promote with `--skip-existing` (or re-promote after raising caps).

## Related code

| Path | Role |
|------|------|
| `lib/tdi/launch-markets.ts` | Wave 1 markets + geo match |
| `lib/tdi/normalize.ts` | CSV/JSON normalize + merge |
| `lib/tdi/promote.ts` | Phase 1 promote builder |
| `lib/tdi/qualifications.ts` | LOA-like tags |
| `scripts/tdi/import-agencies.ts` | Import |
| `scripts/tdi/promote-launch-markets.ts` | Promote |
| `lib/dfs/providers-by-county.ts` | TX hub inventory query |
