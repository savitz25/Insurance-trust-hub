# CMS Marketplace API (InsuranceTrustHub)

**Purpose:** Educational local ACA plan landscape research.  
**Not:** Enrollment, web-broker, quotes for sale, or official eligibility.

## Configuration

| Env | Required | Notes |
|-----|----------|--------|
| `MARKETPLACE_API_KEY` | Yes (server) | From [CMS developer portal](https://developer.cms.gov/marketplace-api). **60-day rotation.** Never expose to the browser. |
| `MARKETPLACE_API_BASE` | No | Default `https://marketplace.api.healthcare.gov/api/v1` |

Set keys only in Vercel / server env. Client code must call **our** routes (`/api/marketplace/*`).

## Endpoints used

| CMS path | Method | Use |
|----------|--------|-----|
| `/counties/by/zip/{zip}?year=` | GET | Resolve county FIPS for a ZIP |
| `/plans/search` | POST | Individual market plans for household + place |

Optional (existing Plan Explorer only): providers & drugs under `/api/marketplace/providers|drugs/*` — **not** promoted in planners until match quality is product-ready.

## Internal modules

| File | Role |
|------|------|
| `client.ts` | Server-only HTTP client, retries/backoff, plan search |
| `plans-search.ts` | Landscape aggregates, **research path heuristics**, narrative |
| `errors.ts` | Structured errors + log sanitization |
| `cache.ts` | Short in-memory TTL cache (default ~15 min) |
| `ptc-context.ts` | Educational PTC context (not official awards) |
| `coverage.ts` | Doctor/Rx match helpers (Plan Explorer) |

## Research path heuristics (Phase 2)

Deterministic selection for three consumer research paths:

1. **Lowest premium** — lowest full premium among **Bronze**; if no Bronze in the CMS response, lowest premium of any returned plan.  
2. **Balanced** — **median-premium Silver** (stable middle); single Silver uses that plan; if no Silver, median overall premium plan.  
3. **Higher protection** — lowest-premium **Gold**; if CMS returns no Gold, **do not invent Gold** — fall back to lowest Silver, then Bronze.

Ties broken by plan `id` string order. Documented in code comments in `plans-search.ts` and `docs/MARKETPLACE-API-PHASE-2.md`.

## Rate limits & ops

- Prefer short TTL cache (`cache.ts`) — do not bulk-scrape the catalog.  
- Client retries **429 / 502 / 503 / timeout** up to 3 attempts with exponential backoff.  
- Fail **closed**: if the key is missing or CMS errors, return structured failure — **never invent premiums**.  
- Planners fall back to educational state-adjusted baselines with an honest notice.

## Consumer surfaces

| Surface | Phase |
|---------|--------|
| `/tools/cost-estimator` | 1 landscape merge + 2 snapshot / path cards / narrative |
| `/calculators/aca-subsidy` | same |
| `/tools/aca-plan-explorer` | Full plan list (prior) |
| `POST /api/marketplace/landscape` | Server landscape for planners |

## Compliance copy

Always pair live data with:

- Educational research tool — not HealthCare.gov  
- Not an enrollment application  
- Verify final prices and eligibility on HealthCare.gov  
- Plan year + retrieval timestamp when showing CMS data  

## Key rotation

When CMS rotates the 60-day key, update `MARKETPLACE_API_KEY` in Vercel and redeploy (or env-only refresh). No code change required.

## Deferred

- My Insurance save / email (Phase 3)  
- Drug / doctor research UI in planners  
- Network adequacy claims  
