# Insurance Trust Hub — Phase 12: Medicare Market Intelligence Expansion

**Date:** 2026-08-09

## Positioning

> Understand your Medicare market before anyone sells you a plan.

Separate from ACA Marketplace / Plan Explorer tracks.

## Routes

| Surface | Path |
|---------|------|
| Medicare hub | `/medicare` |
| County intelligence (canonical) | `/medicare/[state]/[county]` e.g. `/medicare/fl/miami-dade` |
| Contract intelligence | `/medicare/contracts/[contractId]` |
| Legacy county dashboards | `/data/counties/[slug]` (still live; links to canonical) |
| Complaint Index | `/data/plan-complaint-index` |

## County surfaces

- Reuses CMS county-summaries extract (enrollment + star distribution + top contracts)
- Improved framing, vintage labels, Medicare.gov primary handoff
- Contract rows link to contract intelligence pages
- Agents demoted to optional secondary section (not primary CTA)
- Index only when `isMedicareCountyIndexable` (material contracts + enrollment + top list)

## Contract intelligence

- Built from `complaint-rankings.json` `byContractId` + presence in curated county top lists
- Fields: rate, measure star, ranks (US/FL/TX), material states, county enrollment presence
- Fail closed when neither complaint nor county presence exists
- Sitemap: quality-gated subset of county-top contracts with complaint rates

## Data / vintage

| Extract | Role |
|---------|------|
| CPSC July 2026 enrollment | County enrollment / material contracts |
| 2026 Star Ratings C28/D02 | Complaint rates + measure stars |
| County-summaries precompute | County dashboards |

All surfaces show source + syncedAt / dataVintage. No invented MA penetration / YoY when notes say unavailable.

## Integration

- Tools flagship → `/medicare`
- Medicare research router → county hub
- Complaint Index ↔ counties ↔ contracts
- Provider lookup remains FFS/Opt Out (not MA network)

## Measurement

`medicare_county_opened`, `medicare_plan_intelligence_opened`, `medicare_tool_handoff`, `outbound_medicare_gov_click`

## Next hooks

- Carrier org rollups across contracts
- Expand curated counties only when extracts support differentiated value
- Light My Insurance “save Medicare market” objects
