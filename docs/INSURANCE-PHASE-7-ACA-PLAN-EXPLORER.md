# Insurance Trust Hub — Phase 7: Live ACA Plan Explorer

**Date:** 2026-08-08  
**Route:** `/tools/aca-plan-explorer`  
**API:** `POST /api/marketplace/plans`

## Product

Research-only Coverage Intelligence tool:

1. ZIP + household ages (+ optional income, tobacco, year)  
2. Live CMS Marketplace plan list when `MARKETPLACE_API_KEY` is set  
3. Sort / filter metal, type, HSA  
4. Compare up to 3 plans  
5. Plan detail panel (mini X-Ray)  
6. Optional save snapshot to My Insurance  
7. Always: sources, estimates labeled, HealthCare.gov link  

**Not:** enrollment, lead gates, invented premiums, doctor/drug claims, “best plan” awards.

## Architecture

| Module | Role |
|--------|------|
| `lib/marketplace/client.ts` | CMS API counties + plans/search; fail closed |
| `lib/marketplace/cache.ts` | 15m in-memory cache by request signature |
| `lib/marketplace/ptc-context.ts` | Educational PTC context (not official award) |
| `lib/marketplace/types.ts` | Shared types / plan year default 2026 |
| `app/api/marketplace/plans/route.ts` | Server POST |
| `components/marketplace/aca-plan-explorer.tsx` | Full UI |

## Env

```bash
MARKETPLACE_API_KEY=   # from CMS Marketplace API key request
# optional:
MARKETPLACE_API_BASE=https://marketplace.api.healthcare.gov/api/v1
```

Keys expire ~60 days — empty/error states stay honest when missing or rotated.

## Provenance on results

- `sourceSystem`: `cms_marketplace_api` | `unavailable`  
- `planYear`, `retrievedAt`, county FIPS, ZIP  
- Full premium: issuer-reported when returned  
- After-credit premium: **educational estimate** when not provided by API  

## Empty states

| Code | Meaning |
|------|---------|
| `missing_api_key` | No key — do not invent plans |
| `invalid_zip` | Bad ZIP |
| `county_not_found` | CMS county resolve failed |
| `empty_market` | API returned zero plans |
| `api_error` / `upstream_timeout` | Upstream failure |

## Trust copy

Visible research-only framing on page + results. No lead form on the tool.

## Later phases (not this ship)

- Doctor / drug checkers on plan detail  
- Full OOP utilization total-cost engine  
- Statewide marketplace landscape PUF aggregates  
