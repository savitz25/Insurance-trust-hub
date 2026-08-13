# Mississippi MID Agency Inventory (Phase 24)

Insurance **Producer Entity** / business agencies only on the public directory.  
Phase 1 `resolveProviderTrustState` → `verified` required before public promote.  
Lead forms stay off for MS Wave 1. Medicare-certified is never inferred from MID data.

## Official source

[MID Individual and Entity Licensing Search](https://www.mid.ms.gov/mississippi-insurance-department/licensing-search/individual-and-entity-licensing-search/)

Ops path used for this file:

1. Individual and Entity Licensing Search
2. Entity
3. Insurance Licensing
4. License Type: **Insurance Producer Entity**
5. City / list search → Excel/CSV download

Regulator: **Mississippi Insurance Department (MID)**  
The search page states: **only active licenses are included in list downloads.**

## File on disk

`data/ms-raw/Mississippi_csv.csv` (gitignored; modified 13 Aug 2026)

Format: **CSV** (UTF-8, comma-separated). Not a carrier list and not a bulk individual producer dump.

### Real headers

| Header | Maps to |
|--------|---------|
| `AGENCYID` | License / entity identity |
| `NAME` | Legal / display name (HTML entities such as `&#39;` are decoded) |
| `MAILADDRESS1` / `MAILADDRESS2` / `MAILADDRESS3` | Street address (joined) |
| `MAILCITY` | City |
| `MAILSTATE` | HQ state |
| `MAILZIP` | ZIP (ZIP+4 trimmed to 5) |
| `PHONE` | Phone when present |
| `EXP. DATE` | Expiration (`M/D/YYYY`) |

No license-type, status, NPN, county, email, or website columns. License type is recorded as `Insurance Producer Entity` because that is the export filter. County is inferred from a documented city map for Wave-1 labels only.

## Inspection (13 Aug 2026)

| | Count |
|---|---:|
| Source rows | **10,645** |
| Missing name / AGENCYID | 0 / 0 |
| Phone present | 10,318 |
| Unexpired vs expired (as of 13 Aug 2026) | 10,615 / 30 |
| Mississippi mail address | **1,422** |
| All other states | 9,223 |

This is a nationwide list of entities that hold an MS Insurance Producer Entity license. Only MS-addressed rows are hub-placed.

Largest MS cities: Jackson 105 · Ridgeland 69 · Hattiesburg 60 · Madison 57 · Gulfport 57 · Tupelo 56 · Brandon 49 · Meridian 45 · Biloxi 38 · Ocean Springs 31 · Olive Branch 28 · Flowood 24 · Southaven 22. Greenville 13 — present, too thin for a dedicated hub.

`--firms-only` dry-run of this file (13 Aug 2026): 10,645 source rows · 2 missing `AGENCYID` · 10,643 unique entity licenses · 1,421 MS-address firms · Wave-1 promote-eligible **821** (jackson 376 / gulfport-biloxi 206 / tupelo 67 / hattiesburg 65 / southaven 60 / meridian 47). Gulf Coast cap is 200, so expected public Wave-1 promote is **815**.

## Wave 1 launch markets

| Market id | Display | Hub | Cap |
|-----------|---------|-----|----:|
| `jackson` | Jackson metro | `/hubs/mississippi/jackson` | 400 |
| `gulfport-biloxi` | Gulf Coast | `/hubs/mississippi/gulfport-biloxi` | 200 |
| `hattiesburg` | Hattiesburg | `/hubs/mississippi/hattiesburg` | 150 |
| `southaven` | Southaven / DeSoto | `/hubs/mississippi/southaven` | 100 |
| `tupelo` | Tupelo | `/hubs/mississippi/tupelo` | 100 |
| `meridian` | Meridian | `/hubs/mississippi/meridian` | 100 |

Matching: city first. ZIP prefix only for Jackson (`392`) and Gulf Coast (`395`) — `391`/`386`/`394` bleed into other cities and are not used as prefixes.

## Promote rules

Promote only when:

1. Business / Insurance Producer Entity
2. Active (export is active-only; expired `EXP. DATE` still fail-closed)
3. Mississippi mail address
4. License number (`AGENCYID`) present
5. Wave-1 city match
6. Phase 1 trust state `verified`

Out-of-state headquarters may be staged and are **not** shown on local hubs.

## Commands

```bash
npm run check:phase24-ms
npm run ms:status
npm run ms:import -- --file data/ms-raw/Mississippi_csv --firms-only --dry-run
npm run ms:import -- --file data/ms-raw/Mississippi_csv --firms-only --confirm
npm run ms:promote -- --dry-run --limit 20
npm run ms:promote -- --confirm
```

Writes require `--dry-run` or `--confirm`.

Apply `supabase/migrations/20260820120000_mississippi_mid_inventory.sql` in the Supabase SQL Editor before a live import.

## Residual risks

- No LOA / line column — public profiles show entity class only, not A&H vs P&C.
- Names sometimes glue suffixes (`INSURANCELLC`); we insert a space for `INSURANCE`/`AGENCY` + `LLC`/`INC` and decode HTML entities.
- Southaven is Mississippi DeSoto, not the Tennessee Memphis hub.
- Greenville (13 MS rows) is not a Wave-1 hub.
