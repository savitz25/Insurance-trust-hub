# Ohio ODI Agency Inventory (Phase 10)

Agencies / **business entities** only. No bulk individual producers.  
Phase 1 `resolveProviderTrustState` → `verified` required before public promote.  
Florida DFS, Texas TDI, and New Jersey DOBI pipelines are unchanged.

## Chosen data source

### Investigated

| Surface | URL | What it actually is |
|---------|-----|---------------------|
| DataOhio — Insurance Active Licenses | https://data.ohio.gov/wps/portal/gov/data/view/active-licenses | **Summary counts** (active licenses, residency type, license type). **Not** row-level licensee records. Daily refresh of aggregates. |
| ODI Agent/Agency Locator | https://gateway.insurance.ohio.gov/ | Interactive public lookup (business entity search). Use for **verification UX**, not bulk ingest. |
| ODI Agent/Agency Mailing Lists | https://gateway.insurance.ohio.gov/UI/ODI.Agent.Public.UI/MailingList.mvc | Official report generation for agent/agency lists. **Preferred ops export** of business entities. |
| ODI public site | https://insurance.ohio.gov/ | Licensing home / business-entity guidance. |

### Decision

There is **no Texas-style Socrata bulk CSV** of every Ohio agency. DataOhio’s published “Active Licenses” dataset is **counts**, not names/addresses/license numbers.

**Primary production path:** ops export of **business entities / agencies** from the official ODI Mailing List tool (or a DOBI-equivalent official extract if ODI provides one to the org). Save under `data/ohio-raw/agencies.csv` (gitignored).

**Do not** scrape the Agent Locator as the primary production strategy. Locator remains the consumer re-check URL.

## Ops download steps (when running live import)

1. Open [ODI Agent/Agency Mailing List](https://gateway.insurance.ohio.gov/UI/ODI.Agent.Public.UI/MailingList.mvc).
2. Generate a **business entity / agency** list (not individual producers).
3. Export CSV (or Excel → Save as CSV UTF-8).
4. Confirm columns include license number + business name + city/county/ZIP + status. LOAs/NPN if available.
5. Save to `data/ohio-raw/agencies.csv`.
6. Apply migration `20260814120000_ohio_odi_inventory.sql` in Supabase.
7. Run import/promote commands below.

If the mailing-list UI requires an account or staff request, file that request and keep the batch `notes` field updated with the ticket/export date.

## Field map (flexible headers)

Importer accepts common aliases (`lib/odi/normalize.ts`):

| Column ideas | Staging |
|--------------|---------|
| License Number / Ohio License Number | `license_number` |
| Business / Organization / Agency Name | `legal_name` / `display_name` |
| Entity Type (Business / Organization / Individual) | **Individuals skipped** |
| License Type | `license_types[]` |
| Line of Authority / Qualification | `qualifications[]` |
| Status | active / inactive |
| Issue / Effective / Expiration | dates |
| City, County, State, Zip | geo + launch market |
| NPN | `npn` |

Regulator on public providers: **Ohio Department of Insurance**.  
Lookup: [ODI Agent Search](https://gateway.insurance.ohio.gov/UI/ODI.Agent.Public.UI/AgentSearch.mvc/DisplaySearch).

## LOA → specialty tags

Mapped when possible (never invent Medicare-certified):

- Health · Life · Property & Casualty · Personal Lines · Title · Agency

Logic: `lib/odi/qualifications.ts` (same public specialty surface as FL/TX).

## Wave 1 launch markets

| Market id | Display | Hub | Cap |
|-----------|---------|-----|-----|
| `columbus` | Columbus / Franklin | `/hubs/ohio/columbus` | 2000 |
| `cleveland` | Cleveland / Cuyahoga | `/hubs/ohio/cleveland` | 2000 |
| `cincinnati` | Cincinnati / Hamilton | `/hubs/ohio/cincinnati` | 2000 |
| `toledo` | Toledo / Lucas | `/hubs/ohio/toledo` | 1500 |
| `akron` | Akron / Summit | `/hubs/ohio/akron` | 1500 |
| `dayton` | Dayton / Montgomery | `/hubs/ohio/dayton` | 1500 |

Matching order: **city list → county aliases → ZIP 3-digit prefix**.  
Do not promote statewide residual into a single hub.

## Schema

Migration: `supabase/migrations/20260814120000_ohio_odi_inventory.sql`

| Table | Access |
|-------|--------|
| `odi_import_batches` | service_role only (RLS) |
| `odi_license_raw` | service_role only |
| `odi_producers` | service_role only |
| `odi_provider_promotions` | service_role only |
| `providers` (verified) | public read of verified only |

## Commands

```powershell
npm run dfs:env
npm run check:phase10-odi

# Fixture dry-run (no DB)
npm run odi:import -- --file scripts/odi/fixtures/odi-agencies-sample.csv --launch-markets-only --dry-run

# Live import after ops CSV exists
npm run odi:import -- --file data/ohio-raw/agencies.csv --launch-markets-only

# Promote
npm run odi:promote -- --dry-run --market columbus --limit 25
npm run odi:promote -- --market all
npm run odi:promote -- --market cleveland --limit 100
```

Requires true `SUPABASE_SERVICE_ROLE_KEY` (JWT role `service_role`).

## Consumer surfaces

- Hubs: Columbus, Cleveland, Cincinnati, Toledo, Akron, Dayton
- Directory: `/directory?state=OH&verified=true` — first-class Ohio chip
- Profiles: research dossier; **How verified = Ohio Department of Insurance (ODI)**; license #; NPN when present; no Medicare-from-ODI claims

## Limitations

1. **No public row-level bulk file** on DataOhio — live inventory waits on mailing-list / official export.
2. County may be sparse depending on export columns — city + ZIP still match Wave 1.
3. Individuals are never imported or promoted.
4. Appointments / Places enrichment out of scope for Phase 10.

## Refresh

Re-export mailing list monthly (or after major ODI updates) → re-run import (upsert by license) → promote with `--skip-existing`.
