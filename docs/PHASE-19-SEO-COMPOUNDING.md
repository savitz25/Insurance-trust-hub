# Phase 19 — SEO compounding on live inventory

Concentrate authority on metros that already have verified agencies. Empty markets stay `noindex,follow`.

## Cluster link map

| Cluster | Hub | Guide(s) | Directory | Tools |
|---------|-----|----------|-----------|-------|
| South Florida | `/hubs/south-florida` | Miami-Dade, Broward, Palm Beach, Florida ACA | `?state=FL` | Marketplace, planners, Complaint Index |
| Jacksonville | `/hubs/florida/jacksonville` | Florida ACA | `?state=FL` | same |
| Houston | `/hubs/texas/houston` | Houston + Texas ACA | `?state=TX` | same |
| Dallas–Fort Worth | `/hubs/texas/dallas-fort-worth` | Dallas + Texas ACA | `?state=TX` | same |
| Las Vegas | `/hubs/nevada/las-vegas` | none (no thin guide) | `?state=NV` | Marketplace + verify |
| Reno | `/hubs/nevada/reno` | none | `?state=NV` | Marketplace + verify |
| Columbus | `/hubs/ohio/columbus` | none | `?state=OH` | Marketplace + verify |
| Burlington | `/hubs/vermont/burlington` | none | `?state=VT` | Marketplace + verify |

## Metadata examples

- Jacksonville: `Licensed insurance agencies in Jacksonville | Florida DFS research`
- Las Vegas: `Las Vegas insurance agency license research | Nevada DOI`
- Burlington: `Licensed insurance agencies in Burlington | Vermont DFR research`

H1s use “Research licensed insurance agencies in …” — never “best” or “cheap quotes.”

## Schema / sitemap

- Hubs: WebPage + BreadcrumbList; ItemList only when verified cards render
- Guides: existing FAQPage for visible FAQs
- Sitemap: `/hubs/south-florida` added; priority cluster URLs ~0.92–0.95; other hubs 0.55

## QA

```bash
npm run check:phase19-seo
npm run check:phase17-inventory
```
