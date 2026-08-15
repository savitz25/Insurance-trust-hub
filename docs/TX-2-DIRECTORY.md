# TX-2 — Texas directory parity with NV-1 / FL-2

Directory = any **active TX-licensed agency** (any home-office state).  
Hubs = launch metro + **TX street address** only (Houston / Dallas / Fort Worth / Austin / San Antonio).

Home office in NY/IL/FL/CA is metadata. Never create a verified home-state listing from TDI.

## What changed

| Before (audit) | After (TX-2) |
|----------------|--------------|
| Import `if (state !== 'TX') skip not_texas` | Stage every TDI agency license; persist real HQ State |
| Blank `State` defaulted to TX | Blank stays blank — **not** non-resident proof and **not** TX-address proof |
| Promote eligibility `not_texas` | HQ ≠ TX is allowed for `--scope directory-statewide` |
| Promote = launch metros + `state=TX` only | Statewide fills `/directory?state=TX`; hubs stay metro + TX HQ |
| `address.state` hardcoded `TX` | Public card shows HQ state; `license_state` / `states_licensed` stay `TX` |

## Commands

```bash
npm run check:phase8-tdi
npm run tdi:import -- --file data/tdi-raw/tdi-agencies.csv --dry-run
npm run tdi:import -- --file data/tdi-raw/tdi-agencies.csv --confirm
npm run tdi:promote -- --scope directory-statewide --dry-run --limit 50
npm run tdi:promote -- --scope directory-statewide --confirm
```

`--launch-markets-only` remains for metro-scoped imports.  
`--scope launch-metros` (default) still fills hubs and queries `state=TX` + `launch_market_id`.  
Writes require `--dry-run` or `--confirm`. Skip-existing is default. Logs → `scripts/output/`.

## Hubs vs directory

| Scope | Who | Where |
|-------|-----|--------|
| `directory-statewide` | Active TX-licensed agencies, any HQ | `/directory?state=TX` |
| `launch-metros` | TX address + Wave-1 market | Houston / Dallas / Fort Worth / Austin / San Antonio hubs |

Statewide promote does **not** set `contact.launch_market_id`. Existing hub rows are skip-existing. A “Houston, CA” firm never lands on the Houston hub.

## Blank State

TDI sometimes omits `State`. That is **unknown HQ**, not proof the firm is non-resident and not proof it has a Texas address. Those rows still stage (they have a TDI agency license) and may enter the statewide directory without a residency badge and without a hub pin.

## Safety

- No deletes of existing TX verified rows
- Skip-existing default; statewide will not overwrite hub contact
- Other states unchanged
- Fail closed on missing license / inactive / expired
- Agencies only — no individual bulk
- Phase 1 `resolveProviderTrustState` → `verified`
