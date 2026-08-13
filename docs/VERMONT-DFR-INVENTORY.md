# Vermont DFR Licensee Inventory (Phase 15)

Agencies / **firms** only on the public directory. Individuals may be staged.  
Phase 1 `resolveProviderTrustState` → `verified` required before public promote.  
FL / TX / OH / NV / NC pipelines are unchanged.

## Download

Quarterly lists from Vermont Department of Financial Regulation:

1. [Producer and individual licensing](https://dfr.vermont.gov/insurance/producer-and-individual-licensing)
2. Spreadsheet document type: https://dfr.vermont.gov/document-type/spreadsheet
3. Save as `data/vt-raw/Producer-Individual-License.xlsx` (gitignored)

Regulator: **Vermont Department of Financial Regulation (VT DFR)**  
Consumer re-check: [NAIC SBS VT lookup](https://sbs.naic.org/solar-external-lookup/lookup/licensee?jurisdiction=VT)

## Workbook inspection (this file)

Sheet: `Producer-Individual License`  
~**146,554** LOA rows · ~**119,769** unique license numbers · all `Active`

Headers include: `FIRST NAME`, `LAST NAME OR BUSINESS NAME`, `NPN`, `RES STATE`, `LICENSE NO`, `LICENSE STATUS`, `LICENSE CLASS`, effective/expiration dates, `LOA NAME` / status, business address / city / state / zip. **No phone or email.** `BUSINESS COUNTY` is mostly empty (sometimes the literal “United States”).

`RES STATE` / `BUSINESS STATE` are often **not Vermont** — this is a nationwide list of people and firms who hold a Vermont license.

| | Count |
|---|---:|
| Rows | 146,554 |
| Unique licenses | 119,769 |
| Resident state = Vermont | 2,215 |
| Business address state = VT | 2,235 |
| Firm heuristic (blank first name or LLC/Inc/Agency…) | 1,993 rows |
| Unique **VT-address firms** | **61** |
| Person-like VT-address rows | ~2,173 |

License class mix (rows): Adjuster-P&C 78,645 · Insurance Producer 64,666 · Auto-Physical Damage 1,356 · Surplus Lines 878 · Limited Lines 315 · Title Agent 204 · Public Adjuster 123 · MGA 31.

VT-address firms by class: Insurance Producer **50** · Limited Lines Producer **11** (mostly self-storage).

One row per LOA — import merges by `LICENSE NO`.

`--firms-only` dry-run of this workbook (13 Aug 2026): 146,554 source rows · 1,993 firm rows / 1,984 unique firm licenses · 144,561 individuals excluded · launch-market firms **burlington 30 / rutland 12 / montpelier 8** · **50** promote-eligible (VT street address + producer/title/surplus/MGA/consultant). Expected public Wave-1 inventory is those 50 firms, not thousands.

## Firm vs individual policy

Fail-closed:

- **Firm** if `FIRST NAME` is blank, or the business-name field matches LLC / Inc / Agency / Insurance / Corp / LLP / PC / Company / Group / Services.
- Named first+last without a firm suffix = **individual** (not promoted).
- Adjuster license classes are never default-promoted.

Limited Lines (self-storage, travel, etc.) are staged as firms but **not** default-promoted.

## Out-of-state HQ

The file is Vermont-licensed, not Vermont-located. ~118k licenses have a non-VT business address.

Same honesty as Nevada:

- **Stage** firms (and optionally individuals).
- **Promote** only VT street address + producer/title/surplus/MGA/consultant class.
- **Hubs** require VT address + city/ZIP match. Texas HQ producers do not appear in Burlington.

## Wave 1 launch markets

| Market id | Display | Hub | Cap |
|-----------|---------|-----|-----|
| `burlington` | Burlington / Chittenden | `/hubs/vermont/burlington` | 200 |
| `montpelier` | Montpelier / central VT (Barre, Waterbury…) | `/hubs/vermont/montpelier` | 100 |
| `rutland` | Rutland / southern VT | `/hubs/vermont/rutland` | 100 |

Matching: city first, then ZIP prefix `054` / `056` / `057`. Excel often drops the leading zero on Vermont ZIPs (`5468` → `05468`).

Expected density after promote is **small** (dozens of firms, not thousands). Empty hubs stay empty.

## Commands

```bash
npm run check:phase15-vt
npm run vt:import -- --file scripts/vt/fixtures/vt-licensees-sample.csv --dry-run
npm run vt:import -- --file data/vt-raw/Producer-Individual-License.xlsx --dry-run --firms-only
npm run vt:import -- --file data/vt-raw/Producer-Individual-License.xlsx --firms-only
npm run vt:promote -- --dry-run
npm run vt:promote -- --market burlington --skip-existing
npm run vt:promote -- --market montpelier --skip-existing
npm run vt:promote -- --market rutland --skip-existing
```

XLSX conversion uses `scripts/vt/xlsx-to-csv.py` (Python + openpyxl). Apply `20260817120000_vermont_dfr_inventory.sql` before a live import.

`--firms-only` skips ~120k individual licenses. Prefer that unless you need the full staging table.

## Refresh path

1. Download the latest quarterly spreadsheet from DFR.
2. Replace `data/vt-raw/Producer-Individual-License.xlsx`.
3. Re-import (`--firms-only` recommended) and promote Wave 1.
4. Spot-check `/directory?state=VT&verified=true` and the three hubs.

Directory chip **Vermont (VT DFR)** appears only when verified count &gt; 0.
