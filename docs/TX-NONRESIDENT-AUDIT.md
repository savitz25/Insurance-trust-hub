# Texas TDI non-resident audit (read-only)

Date: 14 Aug 2026. No inventory writes. Compare to NV-1 and FL-2.

## Verdict

**No — filtered out by address/geo rules.**

A TDI agency that is licensed in Texas but lists `State ≠ TX` is dropped at **import** (`not_texas`) and would also be rejected at promote. Live staging contains **zero** non-TX HQ rows.

## Exact filters

| Layer | Filter | Effect |
|-------|--------|--------|
| Import | `if (n.state !== 'TX') skip not_texas` | Non-TX HQ never enters `tdi_producers` |
| Normalize | `state` from CSV, default `'TX'` if blank | Blank HQ is treated as Texas |
| Import optional | `--launch-markets-only` | Also drops TX-address firms outside Houston / DFW / Austin / San Antonio |
| Launch match | city → county → ZIP prefix; **no HQ-state check** | A firm in “Houston, CA” could get a market id, but import already dropped it |
| Promote query | `.eq('state', 'TX').eq('launch_market_id', market.id)` | Only TX + Wave-1 metro |
| Eligibility | `state !== 'TX'` → `not_texas` | Belt-and-suspenders |
| Promote write | `contact.address.state = 'TX'` | Public rows always look Texas-resident |

Unlike Florida, TDI **does** persist the real `state` field — then refuses to stage it when it is not TX.

## Live inventory (Supabase)

| Metric | Count |
|-------:|
| Staged business (`tdi_producers`) | **18,033** |
| Staged `state = TX` | **18,033** |
| Staged `state ≠ TX` | **0** |
| Staged TX, no launch market | **4,666** |
| Promoted / verified TX providers | **13,062** |
| Promoted sample (400): address ≠ TX | **0** |

Import batch: 62,427 CSV rows, `notes = null` (not launch-markets-only). Non-TX HQ were still stripped by the `not_texas` skip.

## Official TDI agencies CSV (same file ops imported)

`data/tdi-raw/tdi-agencies.csv` — 62,427 rows.

| Slice | Unique licenses / rows |
|-------|------------------------|
| Unique `State = TX` | **18,029** (matches staged) |
| Unique `State ≠ TX` (includes blank) | **30,705** |
| Blank `State` rows | 6,038 (normalized to TX) |
| Row counts: FL / CA / NY HQ | 5,154 / 4,083 / 1,857 |

The directory gap under the NV-1 rule is on the order of **~30k unique TX-licensed agencies with a non-TX (or blank) HQ**, of which tens of thousands have an explicit other-state HQ.

## Samples

### Non-TX HQ, not staged, not promoted

| License | Name | City | ST |
|---------|------|------|----|
| 2282655 | CHELSEA MORGAN SECURITIES INC | STATEN ISLAND | NY |
| 3063246 | AFNI, INC. | BLOOMINGTON | IL |
| 1536401 | JIM BOYD & ASSOCIATES INC | MADISON | GA |
| 2830411 | SEIBERT INSURANCE AGENCY INC | TAMPA | FL |
| 1588440 | ACTION IMMIGRATION BONDS AND INSURANCE SERVICES, INC. | FT LAUDERDALE | FL |
| 2337843 | IMACO CA, INC. | BUENA PARK | CA |
| 3006743 | BRIAN SEIFERLEIN INSURANCE AGENCY PC | KEEGO HARBOR | MI |

### Non-TX HQ, promoted

None. `tdi_producers` has 0 `state ≠ TX`. Public sample of 400 is all `address.state = TX`.

### TX HQ, promoted

| License | Name | City |
|---------|------|------|
| 2185255 | LARA INSURANCE SERVICES, LLC | MILLSAP |
| 2945489 | MAYES RVS, LLC | CARROLLTON |
| 2185389 | MRHASSAN INC | EULESS |
| 2186727 | JOHN LAIDLAW AGENCY INC | FORT WORTH |
| 2969696 | PDT STORAGE, LLC | AUSTIN |
| 3458687 | ONEWAY FINANCIAL, LLC | DALLAS |
| 2230547 | SECURRANTY, INC. | HOUSTON |

### TX HQ, staged, not in a Wave-1 hub (also not in directory)

Alpine, McAllen, Brownsville, Tyler, Port Arthur, etc. — 4,666 firms. Separate from the non-resident question.

## Compare

| | NV-1 | FL-2 | TX today |
|---|---|---|---|
| Directory | Any NV firm license | Any FL-licensed business | **TX address + launch metro only** |
| Hubs | NV street address | Launch county + FL HQ | Launch metro + `state=TX` |
| Non-resident HQ | Included in directory | Included after FL-2 | **Never staged** |

## Recommendation — **implemented (TX-2)**

See `docs/TX-2-DIRECTORY.md`. Implemented on `main`:

1. Removed import `not_texas` skip (still require a TX license number from the TDI agencies file).
2. Persist HQ `state` + city; blank stays blank (not non-resident proof).
3. Promote `--scope directory-statewide`: active TX-licensed agencies, any HQ, `states_licensed=['TX']` only, home state metadata.
4. Hubs: keep `state=TX` + launch market. Do not attach non-TX HQ to Houston/DFW cards.
5. Idempotent `--dry-run` / `--confirm`, skip-existing. No FL/CA verified licenses.

## Command

```bash
npm run tdi:audit-nonresident-tx
```
