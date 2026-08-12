# New Jersey DOBI Agency Inventory (Phase 9)

Agencies / **organization** entities only. No bulk individual producers.  
Phase 1 `resolveProviderTrustState` → `verified` required before public promote.  
Florida DFS and Texas TDI pipelines are unchanged.

## Data reality (important)

Unlike Florida DFS bulk CSVs and Texas data.texas.gov agency open data, **New Jersey does not publish a free, stable bulk agency CSV** comparable to those sources.

### Known public surfaces

| Resource | URL | Notes |
|----------|-----|--------|
| DOBI Licensee Search | https://www.state.nj.us/dobi/DOBI_LicSearch/index.html | Interactive search |
| NJ Insurance Licensing | https://www.nj.gov/dobi/inslic.htm | Licensing home |
| SBS producer online services | Via DOBI/SBS | May require account |
| NIPR Producer Database | NIPR | Often subscription / not free bulk |

### Acquisition paths (ops)

1. **Preferred:** Official bulk/export of **organizations / agencies** from DOBI or SBS if available to Insurance Trust Hub ops.
2. **OPRA / bulk request** to NJ DOBI for active organization licensees (document request ID in import batch notes).
3. **NIPR** organization extract if credentials exist — filter to NJ + business entities only.
4. **Do not** rely on brittle public HTML scraping as the primary production strategy unless explicitly approved, rate-limited, and monitored.

### If bulk file is not yet available

- Apply migration, run fixture dry-run, ship hubs/directory wiring (honest empty counts).
- When file arrives: save under `data/nj-raw/agencies.csv` (gitignored) and run import/promote.

## Wave 1 regions (aligned with ACA guides)

| Region id | Display | Counties (code) | Hub | Cap |
|-----------|---------|-----------------|-----|-----|
| `south_jersey` | South Jersey | Camden, Burlington, Gloucester, Atlantic, Cape May, Cumberland, Salem | `/hubs/new-jersey/south-new-jersey` | 2000 |
| `central_jersey` | Central Jersey | Middlesex, Mercer, Monmouth, Ocean, Somerset | `/hubs/new-jersey/central-new-jersey` | 2000 |
| `north_jersey` | North Jersey | Bergen, Essex, Hudson, Passaic, Morris, Union (+ Sussex, Warren, Hunterdon for NW) | `/hubs/new-jersey/north-new-jersey` | 2500 |

Guides:

- `/guides/new-jersey-aca-marketplace`
- `/guides/south-jersey-aca-marketplace`
- `/guides/central-jersey-aca-marketplace`
- `/guides/north-jersey-aca-marketplace`

Matching: **county → city list → ZIP 3-digit prefix**.

## Schema

Migration: `supabase/migrations/20260813120000_new_jersey_dobi_inventory.sql`

| Table | Access |
|-------|--------|
| `nj_import_batches` | service_role (RLS) |
| `nj_license_raw` | service_role |
| `nj_producers` | service_role |
| `nj_provider_promotions` | service_role |
| `providers` (verified) | public verified-only (existing RLS) |

## Expected CSV columns (flexible headers)

Importer accepts common aliases. Prefer:

| Column ideas | Maps to |
|--------------|---------|
| License Number / Reference Number | `license_number` |
| Organization Name / Business Name / Agency Name | name |
| Entity Type (Organization/Business) | filters individuals |
| License Type | `license_types[]` |
| Line of Authority / Qualification | `qualifications[]` |
| Status | active/inactive |
| Issue / Expiration dates | dates |
| City, County, State, Zip | geo |
| NPN | `npn` |

## Commands

```powershell
# Apply migration in Supabase SQL Editor first

# Fixture dry-run (no DB writes)
npm run nj:import -- --file scripts/nj/fixtures/nj-agencies-sample.csv --launch-regions-only --dry-run

# Live import when ops file exists
npm run nj:import -- --file data/nj-raw/agencies.csv --launch-regions-only

# Promote (supports --region south|central|north|all)
npm run nj:promote -- --dry-run --region north --limit 25
npm run nj:promote -- --region south --limit 50 --skip-existing
npm run nj:promote -- --region all
```

### Promote gates

Promote only when **all** are true:

- organization / agency entity (`entity_type = business`)
- active / valid when status or expiration is present
- state = NJ
- Wave-1 launch-region geography match
- Phase 1 `resolveProviderTrustState` → verified


## Consumer surfaces

- Hubs: `/hubs/new-jersey/north-new-jersey`, `…/central-new-jersey`, `…/south-new-jersey`
- Directory: `/directory?state=NJ&verified=true`
- Profiles: DOBI regulator wording; NPN when present; research dossier

## Limitations

1. **No free bulk URL** in Phase 9A — ops-supplied file required for live inventory.  
2. Interactive DOBI search is for verification UX, not the import engine.  
3. Agencies/organizations only — individuals skipped when entity type is present.  
4. No Places / appointments in Phase 9.  
5. County definitions are research framing aligned with guides; ZIP/county still rule matching.

## Related code

| Path | Role |
|------|------|
| `lib/nj/launch-regions.ts` | Wave 1 regions + geo |
| `lib/nj/normalize.ts` | CSV normalize + merge |
| `lib/nj/promote.ts` | Phase 1 promote |
| `scripts/nj/import-agencies.ts` | Import |
| `scripts/nj/promote-launch-regions.ts` | Promote |
| `docs/NEW-JERSEY-DOBI-INVENTORY.md` | This doc |
