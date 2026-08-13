# Phase 22 — Performance and crawl efficiency

Keep crawl budget on live inventory and flagship tools. Inventory stays dynamic and honest.

## Crawl targets (index)

- `/` `/tools` `/tools/marketplace-plan-research`
- `/hubs/south-florida` `/hubs/florida/jacksonville` `/hubs/texas/houston` `/hubs/nevada/las-vegas`
- `/hubs/vermont/burlington` `/hubs/ohio/columbus`
- `/directory?state=FL|TX|OH|NV|VT&verified=true` (linked; not query-spammed in sitemap)
- Cluster ACA guides + `/methodology` + `/data/plan-complaint-index`

## Do not prioritize

- Empty non-launch hubs (`noindex,follow` when verified count is 0)
- `/my-insurance` `/admin` `/api` `/auth` (robots disallow)
- Seed / fallback catalog (never sitemapped)

Canonicals stay on `https://www.insurancetrusthub.com`. Sitemap filters out `movetrusthub.com`.

## Perf changes

- Inter: `display: swap` + font fallback metrics
- `optimizePackageImports` for `lucide-react`
- Hub lists: one card grid (no duplicate health/multi-line cards)
- Directory/hub Save buttons hydrate after first paint
- Marketplace: ZIP form first; planner/save chunk after results
- PWA prompt deferred (`ssr: false`)
- Profile lead/review forms split from the critical path

Hubs remain `force-dynamic` so verified counts cannot stale-empty.

## QA

```bash
npm run check:phase22-perf
npm run check:phase17-inventory
```
