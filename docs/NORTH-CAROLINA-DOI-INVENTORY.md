# North Carolina DOI Agency Inventory (Phase 13)

Agencies / **business entities** only. No bulk individual producers.  
Phase 1 `resolveProviderTrustState` → `verified` required before public promote.  
Florida DFS, Texas TDI, Ohio ODI, and New Jersey DOBI pipelines are unchanged.

## Chosen data source

### Investigated

| Surface | URL | What it actually is |
|---------|-----|---------------------|
| NC DOI SBS Report Generator | https://www.ncdoi.gov/licensees/insurance-producer-and-adjuster-licensing/continuing-education-agents-and-adjusters/sbs-report-generator-service | Official **paid per-row** SBS CSV export. **Preferred production path** for business-entity / agency lists. |
| NAIC SBS licensee lookup | https://sbs.naic.org/solar-external-lookup/lookup/licensee?jurisdiction=NC | Interactive public lookup. Use for **verification UX**, not bulk ingest. |
| NC DOI consumers / helpful links | https://www.ncdoi.gov/consumers/helpful-links | Consumer entry to official lookup tools. |

### Decision

There is **no free statewide bulk dump** of every NC agency in this builder environment. SBS Report Generator is the official export (typically billed per row).

**Primary production path:** ops export of **business entities / agencies only** from the NC DOI SBS Report Generator. Save under `data/nc-raw/agencies.csv` (gitignored).

**Do not** scrape SBS HTML as the primary production strategy. The NAIC SBS lookup remains the consumer re-check URL.

This phase ships schema + import/promote + fixture + consumer wiring. Live Wave-1 promote happens when `agencies.csv` is acquired.

## Ops download steps (when running live import)

1. Open the [NC DOI SBS Report Generator](https://www.ncdoi.gov/licensees/insurance-producer-and-adjuster-licensing/continuing-education-agents-and-adjusters/sbs-report-generator-service).
2. Request / generate a **business entity / organization / agency** producer list (not individual producers).
3. Filter to North Carolina licenses where the UI allows it.
4. Export CSV (or Excel → Save as CSV UTF-8). SBS may bill per row — keep the batch `notes` field updated with export date and cost ticket.
5. Confirm columns include license number + business name + city/county/ZIP + status. LOAs/NPN if available.
6. Save to `data/nc-raw/agencies.csv`.
7. Apply migration `20260815120000_north_carolina_doi_inventory.sql` in Supabase.
8. Run import/promote commands below.

## Field map (flexible headers)

Importer accepts common aliases (`lib/nc/normalize.ts`):

| Column ideas | Staging |
|--------------|---------|
| License Number / Licensee Number | `license_number` |
| Business / Organization / Agency / Firm Name | `legal_name` / `display_name` |
| Entity Type (Business / Organization / Individual) | **Individuals skipped** |
| License Type / Class | `license_types[]` |
| Line of Authority / Qualification / LOA | `qualifications[]` |
| Status | active / inactive |
| Issue / Effective / Expiration | dates |
| City, County, State, Zip | geo + launch market |
| NPN | `npn` |

Regulator on public providers: **North Carolina Department of Insurance**.  
Lookup: [NAIC SBS NC licensee search](https://sbs.naic.org/solar-external-lookup/lookup/licensee?jurisdiction=NC).

## LOA → specialty tags

Mapped when possible (never invent Medicare-certified):

- Health · Life · Property & Casualty · Personal Lines · Title · Agency · Public Adjuster

Logic: `lib/nc/qualifications.ts` (same public specialty surface as FL/TX/OH).

## Wave 1 launch markets

| Market id | Display | Counties | Hub | Cap |
|-----------|---------|----------|-----|-----|
| `charlotte` | Charlotte / Mecklenburg | Mecklenburg (+ Union, Cabarrus, Gaston aliases) | `/hubs/north-carolina/charlotte` | 2000 |
| `triangle` | Research Triangle | **Wake, Durham, Orange** | `/hubs/north-carolina/raleigh` | 2000 |
| `greensboro` | Greensboro / Guilford | Guilford | `/hubs/north-carolina/greensboro` | 1500 |
| `wilmington` | Wilmington / New Hanover | New Hanover | `/hubs/north-carolina/wilmington` | 800 |

Matching order: **city list → county aliases → ZIP 3-digit prefix**.  
ZIP prefixes are last-resort and can bleed (especially `275` / `272`). City + county win first. Do not promote statewide residual into a single hub.

Consumer guides already on site:

- `/guides/north-carolina-aca-marketplace`
- `/guides/charlotte-aca-marketplace`
- `/guides/research-triangle-aca-marketplace`

## Commands

Dry-run fixture (no Supabase required):

```bash
npm run nc:import -- --file scripts/nc/fixtures/nc-agencies-sample.csv --launch-markets-only --dry-run
npm run nc:promote -- --dry-run
npm run check:phase13-nc
```

Live ops (after SBS export + migration):

```bash
npm run nc:import -- --file data/nc-raw/agencies.csv --launch-markets-only
npm run nc:promote -- --market charlotte --limit 50 --skip-existing
npm run nc:promote -- --market triangle --skip-existing
npm run nc:promote -- --market greensboro --skip-existing
npm run nc:promote -- --market wilmington --skip-existing
# or
npm run nc:promote -- --market all --skip-existing
```

`--skip-existing` is the default unless `--re-promote` is passed.

## Limitations

- SBS export is official and typically **paid per row**. This repo does not store bulk files.
- No individuals. Rows with individual/producer entity type are skipped.
- County is often missing on SBS rows — city + ZIP matching is the fallback.
- ZIP 3-digit prefixes can overlap adjacent counties; Wave 1 is not a complete statewide census.
- Medicare-certified is never inferred from NC DOI LOAs.
- Directory chip **North Carolina (NC DOI)** appears only when verified NC count &gt; 0.

## Refresh path

1. Re-export business entities from SBS (note export date).
2. `npm run nc:import -- --file data/nc-raw/agencies.csv --launch-markets-only`
3. `npm run nc:promote -- --market all --skip-existing`
4. Spot-check `/directory?state=NC&verified=true` and Wave-1 hubs.
5. Re-check a sample license on the official SBS lookup.

## Exact ops next steps (if no CSV yet)

1. Purchase / generate the **business entity** SBS report from NC DOI.
2. Drop CSV at `data/nc-raw/agencies.csv`.
3. Apply `20260815120000_north_carolina_doi_inventory.sql`.
4. Import launch-markets-only, then promote by market with caps.
5. Confirm NC directory chip appears only after verified count &gt; 0.
