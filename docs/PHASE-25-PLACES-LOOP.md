# Phase 25 — Places loop + match tightening (existing inventory)

Deepen Florida Places enrichment and LOA filters. No new states.

## Loop CLI

```powershell
npm run dfs:enrich-places-loop -- --limit 50 --batch-size 25
npm run dfs:enrich-places-loop -- --confirm --batch-size 50 --max-batches 2
npm run dfs:enrich-places-loop:status
```

| Flag | Default | Notes |
|------|---------|-------|
| `--dry-run` | on unless `--confirm` | No writes |
| `--confirm` | off | Writes `contact.enrichment.google` only |
| `--scope` | `fl` | `fl` = all verified FL agencies; `sfl` = Miami-Dade/Broward/Palm Beach |
| `--county` | `all` | SFL only: `miami_dade` / `broward` / `palm_beach` |
| `--batch-size` | 100 | 1–500 |
| `--limit` | none | Cap eligible pool (dry-run / smoke) |
| `--max-batches` | unlimited | Stop after N batches even if pool remains |
| `--delay-ms` | 300 | Per-request pause (250–400 recommended) |
| `--min-match-rate` | **0.18** | Gate |
| `--max-error-rate` | 0.05 | Gate |
| `--max-ambiguous-rate` | 0.10 | Gate |
| `--strict` | **on** | `--no-strict` restores Phase 6C-2 rescue paths |
| `--refresh` | off | Re-evaluate rows that already have high-confidence snapshots |
| `--resume` | off | Continue from `scripts/output/places-loop-progress.json` |

Progress: `scripts/output/places-loop-progress.json`  
Snapshot aliases: `offset`, `processed`, `matched`, `noMatch`, `ambiguous`, `errors`, `lastBatchAt`, `stoppedReason`.  
Never prints API keys.

If a batch fails a gate the loop **stops**, writes the report, and exits **2**. Offline proof: `npm run check:phase25` (forced `0.10 < 0.18` match-rate stop).

## Write policy (unchanged)

- Store Google snapshot on `contact.enrichment.google`
- Fill website/phone only when empty and not directory/social
- Never overwrite DFS license, verified, county, appointments
- UI still labels Google as a third-party secondary signal (not a ranking)

## Matcher / FP gate (strict)

Fail closed when:

1. Legal/DBA name lacks `insurance|title|agency|broker|underwriter|adjusting|…` **and** Places types are not insurance/finance — **reject even on phone match**
2. Places types are food / lodging / auto_dealer / car_repair / general_contractor dominant — reject
3. Website is a carrier consumer homepage (`progressive.com` etc.) **without** `/agent|/agency|/find-an-agent` path — **reject the match** (not just strip website)
4. Two close candidates — reject as ambiguous (unchanged)

Clear insurance agency names + FL geo + phone/web corroboration still accept.

Loop pool ranking (so A–Z `#1 AUTO` / credit-union rows do not trip the first gate):

- Skip hopeless legal names before calling Places (dealer / contractor / realty / credit union with no insurance keywords)
- Prefer unattempted rows whose legal or DBA name has insurance|agency|title|…
- Search/score the `DBA` segment when DFS stored `LEGAL LLC DBA AGENCY NAME`

Offline QA: `npx tsx scripts/dfs/qa-places-fp-gate.ts`

## LOA specialty chips

Shown only when `regulatorHasLoaSpecialtyTags(state)` is true.

| State | Chips |
|-------|--------|
| FL, TX, OH, NV, VT, NJ, NC, MA | Yes (`?loa=` / `?specialty=`) |
| MS | No — MID entity export has no LOA column |

Hubs: “Showing X of Y verified agencies” when the page is capped.

## Residual risks

- Google Places quota / 429s (retries exist; error-rate gate stops the run)
- Some legitimate DBAs without insurance keywords stay unmatched (by design)
- Strict mode will lower match rate vs the original SFL 24–34% pilot
