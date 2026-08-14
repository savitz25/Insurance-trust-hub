# FL-2 — Florida directory parity with NV-1

Directory = any **active FL-licensed business/agency**.  
Hubs = launch-county / FL street address only (unchanged).

Home office in CA/NC/TX is metadata. Never create a verified home-state listing from DFS.

## What changed

| Before (audit) | After (FL-2) |
|----------------|--------------|
| `--launch-counties-only` required to get anyone staged | Optional. Full import stages all active business rows |
| `state` hardcoded `FL` | `state` = Business State (HQ) |
| `resident_flag` broken | Parses `Resident` / `Non-Resident` |
| Promote = launch counties only | `--scope directory-statewide` adds the rest to `/directory?state=FL` |
| `address.state` always FL | HQ state on the card; `license_state` / `states_licensed` stay FL |

## Commands

```bash
npm run check:phase4-dfs
npm run dfs:import -- --file data/dfs-raw/AllValidLicensesBusiness.csv --type business --dry-run
npm run dfs:import -- --file data/dfs-raw/AllValidLicensesBusiness.csv --type business --confirm
npm run dfs:promote -- --scope directory-statewide --dry-run --limit 50
npm run dfs:promote -- --scope directory-statewide --confirm
```

`--launch-counties-only` remains for county-scoped imports.  
`--scope launch-counties` is still the default promote (hubs).  
Writes require `--dry-run` or `--confirm`. Skip-existing is default.

## Hubs vs directory

Statewide promote does **not** set `contact.launch_county_id` unless the firm has a Florida HQ **and** a launch county. Jacksonville / South Florida / Tampa / Orlando cards stay local.
