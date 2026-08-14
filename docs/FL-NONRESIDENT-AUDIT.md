# Florida DFS non-resident audit (read-only)

Date: 14 Aug 2026. No inventory writes. Compare to NV-1 (`68d5b82`).

## Verdict

**No — filtered out by launch-county / FL-address rules.**

Florida DFS **business** promote does **not** keep FL-licensed non-residents in the directory, except a handful that also listed a Wave-1/2 Florida `Business County`.

NV-1 directory = any NV firm license. FL directory = launch-county geo only.

## Exact filters that drop FL-licensed, out-of-state HQ firms

| Layer | Filter | Effect |
|-------|--------|--------|
| Import flag | `--launch-counties-only` | Skips row unless `matchLaunchCounty(Business County)` hits Miami-Dade / Broward / Palm Beach / Duval / Hillsborough / Orange / Osceola / Seminole / Pinellas / Pasco |
| Normalize | `state` hardcoded to `'FL'` | `Business State` (GA, TX, CA…) is **never stored** |
| Normalize | `residentFlag` regex `/y\|yes\|true\|1/i` | DFS values are `Resident` / `Non-Resident` — **every staged `resident_flag` is false** |
| Promote query | `.eq('state', 'FL').in('county_normalized', launchAliases)` | Only launch-county staged rows are candidates |
| Promote write | `contact.address.state = 'FL'` | Public rows look Florida-resident even if HQ was not |
| Eligibility | `producer.state !== 'FL'` → `not_florida` | Dead code in practice because state is hardcoded |

A typical FL-licensed firm with `Business State=NC` and `Business County` blank / `OUT OF STATE` / Fulton never enters `dfs_producers` when ops uses `--launch-counties-only` (all live business batches have that note).

## Live inventory (Supabase)

| Metric | Count |
|--------|------:|
| Staged business (`dfs_producers`) | 41,783 |
| Staged individual | 0 |
| Staged in launch county | **41,783** (100%) |
| Staged outside launch county / null county | **0** |
| `resident_flag = true` | 0 |
| `resident_flag = false` | 41,783 (parser bug, not real residency) |
| `state ≠ FL` | 0 (hardcoded) |
| Promoted (`dfs_provider_promotions` / verified FL providers) | **18,995** |
| Promoted sample (400): address state = FL | 400 |
| Promoted sample: address state ≠ FL | **0** |

Import batches: 10 business runs, all `notes = launch-counties-only filter`. Latest full file: 104,374 CSV rows → 41,783 unique launch-county licenses staged. Promote caps explain 41,783 staged vs 18,995 public.

## Official DFS business CSV (local, same file ops imported)

`data/dfs-raw/AllValidLicensesBusiness.csv` — 104,374 rows / **98,622** unique licenses.

| Slice | Unique licenses |
|-------|----------------:|
| `Residency Type = Resident` | 66,609 |
| `Residency Type = Non-Resident` | 32,010 |
| `Business State = FL` | ~66.6k resident-aligned |
| `Business State ≠ FL` | **31,659** |
| Launch-county `Business County` | **41,783** (matches staged exactly) |
| Non-FL HQ **and** launch county | **18** |
| Non-FL HQ **and not** launch county | **31,641** |

Those 31,641 unique FL-licensed firms are the directory gap under the NV-1 rule.

## Samples

### Non-FL HQ, would be promoted only if they had a launch county (~18)

| License | Name | City | State | County | Promoted? |
|---------|------|------|-------|--------|-----------|
| E127071 | LANDSEL TITLE AGENCY, INC. | COLUMBUS | OH | DADE | maybe if in the 18 |
| W719011 | DUKE ENERGY FLORIDA,LLC | CHARLOTTE | NC | PINELLAS | maybe |
| W978374 | HOMEWORKS, INC | JACKSONVILLE | OH | DUVAL | maybe |

Public `providers.contact.address.state` is still written `FL`, so they are not visible as non-resident after promote.

### Non-FL HQ, staged? **No** — not in `dfs_producers`

| License | Name | City | State | County | Promoted |
|---------|------|------|-------|--------|----------|
| E019299 | ELECTROLUX CONSUMER PRODUCTS, INC | CHARLOTTE | NC | (none) | N |
| E088014 | WAL-MART.COM USA LLC | BRISBANE | CA | (none) | N |
| E034284 | WARRANTY LINK | CONROE | TX | OUT OF STATE | N |
| E093046 | LOWE'S HOME CENTERS, LLC | MOORESVILLE | NC | (none) | N |
| E082448 | DELL MARKETING LP | ROUND ROCK | TX | OUT OF STATE | N |
| A250461 | SPECIALTY INSURANCE AGENCY INC | WALL TOWNSHIP | NJ | (none) | N |
| E059482 | MERCHANT SERVICES OF NEW JERSEY | EDISON | NJ | (none) | N |
| A195216 | OFFICEMAX INC/OHIO | SHAKER HEIGHTS | OH | (none) | N |
| E082238 | DELL CATALOG SALES L P | NASHVILLE | TX | OUT OF STATE | N |
| E093051 | LOWE'S HOME CENTERS, LLC | MOORESVILLE | NC | (none) | N |

### FL HQ, promoted **Y**

| License | Name | City | State |
|---------|------|------|-------|
| L005530 | CRS BENEFIT CONSULTANTS, INC. | WEST PALM BEACH | FL |
| W550691 | L&D AUTO INC | LARGO | FL |
| W554007 | KENYON POWERBOATS IN C | PALM HARBOR | FL |
| W552520 | VIKING TITLE, LLC | ST. PETERSBURG | FL |
| L105464 | SLYH FINANCIAL GROUP | SAINT PETERSBURG | FL |
| W561765 | BRUCE RECORD MANAGEMENT SERVICES, LLC | ST PETERSBURG | FL |
| W010847 | CRUISE MAGIC INC | LAKE WORTH | FL |
| W550665 | STATEMENT MARINE LLC | SAINT PETERSBURG | FL |
| L104986 | COSURANCE SOLUTIONS | CLEARWATER | FL |
| W640250 | DISH WIRELESS L.L.C. | ST. PETERSBURG | FL |

## Recommendation (not implemented)

**FL-2 directory expand**, if product wants NV-1 parity:

1. Re-import business CSV **without** `--launch-counties-only` (or a `--statewide` mode).
2. Persist `Business State`, `Residency Type` (`Resident` / `Non-Resident`), and mailing state.
3. Directory promote: FL-licensed business + active + license # + Phase 1 verified. Non-resident HQ allowed. `states_licensed = ['FL']` only. Home state metadata only.
4. Hubs unchanged: launch-county / FL address only.
5. Idempotent `--dry-run` / `--confirm` / skip-existing. Do not invent NC/CA/TX licenses.

Until then, `/directory?state=FL` is launch-county Florida-address inventory, not all FL-licensed firms.

## Command

```bash
npm run dfs:audit-nonresident-fl
```
