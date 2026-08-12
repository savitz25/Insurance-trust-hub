# Phase 6C — Google Places Enrichment (South Florida Pilot)

Secondary **public web signals** for promoted, verified Florida agencies.  
**DFS license verification remains the source of truth.** Google data never grants verified status, never ranks hubs, and never invents websites.

## Pilot scope

| County | `launch_county_id` |
|--------|--------------------|
| Miami-Dade | `miami_dade` |
| Broward | `broward` |
| Palm Beach | `palm_beach` |

Default batch: **25–500** agencies (`--limit`, max 1000).  
Default: **only-missing** (skip high-confidence Places matches already stored).

## Env

```text
GOOGLE_PLACES_API_KEY=...          # Places API (New) — server only
SUPABASE_URL=...                   # or NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY=...
```

Never expose the Places key to the browser.

## Storage (no DFS overwrite)

Written under `providers.contact` only:

| Field | Use |
|-------|-----|
| `contact.enrichment.google` | Full `GooglePlacesSnapshot` (placeId, rating, reviewCount, website, mapsUrl, matchConfidence, matchNotes, checkedAt) |
| `contact.website` | Filled **only if empty** and URL is not a directory/social host |
| `contact.phone` | Filled **only if** DFS phone missing/placeholder |
| `contact.enrichment.skipReasons` | `places_no_match` / `places_ambiguous` / etc. |

Never mutates: `license_info`, `verified`, launch county fields, appointment_snapshot.

## Match rules (fail closed)

Accept only **high** confidence from `scoreBusinessMatch` + `pickBestMatch`:

- Strong name similarity  
- FL + city/locality compatible  
- Corroboration: city+state and/or phone and/or website domain  
- Ambiguous close seconds → reject  
- Soft boost for insurance/finance Places types; soft reject food/lodging-only types  
- Directory/social websites (Yelp, Facebook, …) not written as agency website  

## Commands

```powershell
# Preflight
npm run dfs:env

# Dry-run (default without --confirm) — no writes
npm run dfs:enrich-places-sfl -- --dry-run --limit 25
npm run dfs:enrich-places-sfl -- --limit 25

# Single county
npm run dfs:enrich-places-sfl -- --county broward --limit 50 --dry-run

# Live writes (requires API key + --confirm)
npm run dfs:enrich-places-sfl -- --limit 100 --confirm
npm run dfs:enrich-places-sfl -- --county miami_dade --limit 200 --confirm --delay-ms 300

# Re-process already enriched (override only-missing)
npm run dfs:enrich-places-sfl -- --include-enriched --limit 25 --dry-run
```

Logs: `scripts/output/places-sfl-pilot-*.json` (accepted/rejected samples + stats).

## Inspect quality

1. Open log file → `acceptedSample` / `rejectedSample`  
2. Open matched profiles: `/providers/{slug}`  
   - Website button if `contact.website` filled  
   - “Google public data (third-party)” under secondary signals  
3. Unmatched profiles: no Google section, DFS license unchanged  

## Consumer UI

- Website: profile header CTA when present  
- Rating/reviews: secondary signals only — labeled third-party, **not** ITH ranking  
- Hubs: **never** sorted by Google rating  

## Expand after pilot (6C-2)

1. Review accept rate + false positives from logs  
2. Raise `--limit` or drop `--only-missing` carefully  
3. Add counties: `hillsborough`, `pinellas`, `pasco`, `orange`, `osceola`, `seminole` in `lib/enrichment/places-pilot.ts`  
4. Same match gates — do not relax for volume  

## Related code

| Path | Role |
|------|------|
| `lib/enrichment/google-places.ts` | Places API client |
| `lib/enrichment/match.ts` | Strict identity scoring |
| `lib/enrichment/places-pilot.ts` | SFL selection + contact merge |
| `scripts/dfs/enrich-places-south-florida.ts` | Ops pilot runner |
