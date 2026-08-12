# Florida DFS verified inventory pipeline (Phase 4–5)

Phase 5 agency stabilization notes: `docs/PHASE-5-AGENCY-INVENTORY.md`  
**Promote default is business/agencies only** (`--entity business`).

## Goal

Ingest public Florida DFS bulk licensing data, normalize it, and **promote only** records that satisfy Phase 1 `resolveProviderTrustState` → `verified` into the public `providers` table.

Public directory/hub surfaces remain **verified-only**. Empty markets stay honest + `noindex`.

## Official source

- Bulk download portal: https://licenseesearch.fldfs.com/BulkDownload  
- Direct CSV examples (URLs may change; prefer portal):
  - Business valid licenses: `https://www.myfloridacfo.com/downloads/AAS/LicenseeSearch/AllValidLicensesBusiness.csv`
  - Individual valid licenses: `https://www.myfloridacfo.com/downloads/AAS/LicenseeSearch/AllValidLicensesIndividual.csv`

**Do not commit multi-hundred-MB CSVs to git.** Store locally under:

```text
data/dfs-raw/
```

(gitignored, same pattern as `cms-data/`).

## Required files (first release)

| File | `--type` | Purpose |
|------|----------|---------|
| All Valid Licenses – Business | `business` | Agencies / business entities |
| All Valid Licenses – Individual | `individual` | Individual producers |
| Active Appointments – Business | appointment | Phase 6A carrier appointment enrichment |

## Launch / promote counties

**Wave 1**

1. Miami-Dade (DFS may say **Dade**)  
2. Broward  
3. Palm Beach  
4. Duval (Jacksonville)  
5. Hillsborough (Tampa Bay)

**Wave 2**

6. Orange (Orlando)  
7. Osceola (Orlando)  
8. Seminole (Orlando)  
9. Pinellas (Tampa Bay)  
10. Pasco (Tampa Bay)

Hub slug mapping + per-county promote caps: see `lib/dfs/launch-counties.ts`.

```powershell
# Import only promote counties (all waves)
npm run dfs:import -- --file data/dfs-raw/AllValidLicensesBusiness.csv --type business --launch-counties-only

# Promote wave 2 only (skips already-promoted producers)
npm run dfs:promote -- --wave 2
```

## Schema

Migrations (run in order, or run the repair file alone in SQL Editor):

1. `supabase/migrations/20260811115000_ensure_core_providers.sql` — creates `providers` if missing  
2. `supabase/migrations/20260811120000_florida_dfs_inventory.sql` — DFS staging + promotion bridge  
3. `supabase/migrations/20260811130000_repair_providers_and_dfs.sql` — **idempotent repair** if you hit `relation "providers" does not exist`

**If Supabase SQL Editor failed with `providers does not exist`:** paste and run **only**  
`20260811130000_repair_providers_and_dfs.sql` — it creates `providers` then all DFS tables.

| Table | Access |
|-------|--------|
| `dfs_import_batches` | service_role only |
| `dfs_license_raw` | service_role only |
| `dfs_producers` | service_role only |
| `dfs_appointments` | service_role only |
| `dfs_provider_promotions` | service_role only |
| `providers` (verified) | public read of `verified = true` only (existing RLS) |

Apply migration via Supabase CLI or SQL editor before first import.

## Environment (local — preferred)

**Do not paste service-role keys into chat.** Use a local env file.

```powershell
copy .env.example .env.local
# Edit .env.local:
#   SUPABASE_URL=https://YOUR_PROJECT.supabase.co
#   NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
#   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

```powershell
npm run dfs:env
```

Full guide: `docs/LOCAL-ENV.md`

Shell exports still work if you prefer; process env wins over files.

## Commands

```powershell
# 0) Preflight
npm run dfs:env

# 1) Dry-run normalize (no DB)
npm run dfs:import -- --file data/dfs-raw/AllValidLicensesBusiness.csv --type business --launch-counties-only --dry-run

# 2) Import business (launch counties)
npm run dfs:import -- --file data/dfs-raw/AllValidLicensesBusiness.csv --type business --launch-counties-only

# 3) Import individuals (optional)
npm run dfs:import -- --file data/dfs-raw/AllValidLicensesIndividual.csv --type individual --launch-counties-only

# 4) Promote agencies only (Phase 5 default) — Phase 1 gates
npm run dfs:status
npm run dfs:promote -- --dry-run --entity business --limit 20
npm run dfs:promote -- --county duval --entity business --limit 100
npm run dfs:promote -- --entity business
# Individuals: do not bulk-promote in Phase 5 (requires --entity all)

# Guards
npm run check:phase4-dfs
```

## Promotion criteria (must all pass)

1. Non-seed entity id  
2. Re-checkable license number (`cleanLicenseNumber`)  
3. License state `FL`  
4. Regulator name: **Florida DFS**  
5. Fresh `source_checked_at` / `license_checked_at`  
6. `identityMatchAccepted === true` (set at promotion after stable license + name)  
7. Active / valid status  
8. Launch-county geography  
9. Phase 1 `resolveProviderTrustState(provider) === 'verified'`

**Never auto-claim:** Medicare-certified, ratings, reviews, websites (unless later enrichment).

## LOA handling

- Raw LOA strings stored on `dfs_producers.lines_of_authority`  
- Classified into capabilities: `health`, `life`, `property_casualty`, `personal_lines`, … (`lib/dfs/loa.ts`)  
- Mapped to directory `categories` / specialties **without** Medicare tags  

## Public field set (v1)

| Show | Field |
|------|--------|
| Yes | name, license number, LOAs, city/county, phone (if DFS), verified badge/source/date |
| Store, don’t feature | email |
| Phase 6A/6B appointments | `docs/PHASE-6A-APPOINTMENTS.md` · `docs/PHASE-6B-APPOINTMENTS.md` · `npm run dfs:import-appointments` · `npm run dfs:attach-appointments -- --refresh` |
| Later enrichment | website, Google, CMS Medicare |

## Consumer wiring

- Directory: existing verified filter (`filterVerifiedProviders`)  
- Launch hubs: `getVerifiedProvidersForHub(hubSlug)` loads FL verified rows tagged with county at promotion  
- SEO: `buildHubMetadata` / hub stats use live verified counts when providers present → indexable when `verifiedCount > 0`  

## Refresh cadence

- Monthly DFS bulk refresh recommended (or after major regulatory updates)  
- Re-run import → promote; promotion upserts by slug/license  

## If bulk files are not present in CI

Ship pipeline + docs + dry-run. Ops runs import locally with DFS files; production lights up when `providers.verified` rows exist.
