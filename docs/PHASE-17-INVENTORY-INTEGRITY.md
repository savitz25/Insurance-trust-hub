# Phase 17 — Production inventory integrity

Trust lock for live FL / TX / OH / NV / VT inventory. No new states.

## What production already showed (13 Aug 2026)

`/api/inventory/health` on `gojyhmbojbwbpiamoktq`:

| Surface | Count |
|---------|------:|
| Florida verified | 18,995 |
| Texas verified | ~13,062 (directory chip) |
| Ohio verified | 5,306 |
| Nevada verified | 1,827 |
| Vermont verified | 39 |
| Jacksonville / Duval | 2,000 |
| South Florida aggregate | 7,000 |
| Las Vegas | 1,472 |
| Houston | 4,725 |
| Burlington | 26 |

Empty “still verifying” on those launch hubs was **not** the current production path. Env + anon key match the inventory project. Hub pages already call `getHubInventory`.

Integrity bugs that *were* real:

- Hero / SEO appended a **page-scoped** health count (“2,000 verified · 75 health-focused”).
- `/hubs` and `/hubs/browse` implied every metro had verified specialists.
- Jacksonville / Tampa snapshots cited “2,000+ Google ratings” and “80+ carriers”.
- ZIP search said “ranked by public signals”.

## Commands

```bash
npm run check:phase17-inventory
npm run check:phase16-hardening
npm run check:phase11-directory
```

`PHASE17_REQUIRE_LIVE=1` fails if production health cannot be fetched.

## Live smoke (after deploy)

- https://www.insurancetrusthub.com/api/inventory/health — `ok: true`, `byState` populated
- `/hubs/florida/jacksonville` — thousands of Duval cards, not “still verifying”
- `/hubs/south-florida` — aggregate Miami-Dade + Broward + Palm Beach
- `/hubs/nevada/las-vegas`
- `/hubs/vermont/burlington`
- `/directory?state=FL&verified=true` (and TX / OH / NV / VT)
- Homepage — no “850+” / seed language
- One profile per live state — 200 + correct regulator wording

Truly empty non-launch hubs stay empty and `noindex,follow`.
