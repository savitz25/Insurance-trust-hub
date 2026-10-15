# GB3 — Florida canonical county query preparation

Status: **draft, ready for DB change review; not authorized for activation**.
Base main: `88442dfb950cfd1d86af9247c8aadec4726a9003` (includes #107 and #108).
Open PRs #55 and #57 had no overlap with these new files at the ownership check.
No production loader, page, metadata, environment, schema, index or timeout changes.

## Read-only production evidence

Project: `gojyhmbojbwbpiamoktq`.
Audit timestamp: **2026-10-15 02:58:44 UTC** (2026-10-14, America/Indianapolis).
[Aggregate receipt](evidence/fl-county-completeness-2026-10-15.json) and
[repeatable SELECT](evidence/fl-county-completeness-readonly.sql).

The approved Supabase connector executed SELECT/catalog reads and one EXPLAIN
**without ANALYZE**. Audit role was postgres with its existing 2-minute timeout;
no role or timeout was changed. This is a completeness audit, **not a successful
anon 3-second latency test**. Catalog checks found RLS enabled and the public
SELECT policy for anon/authenticated is `verified = true`; the query includes
that restriction explicitly. Anon retains `statement_timeout=3s`.

Population is the exact SQL candidate set used by the public Florida loader:
`verified=true AND states_licensed @> '{FL}'`, then the existing county OR.
It is measured before the unchanged mapper and in-memory trust/geography filters.
The count represents providers, not an assertion that every candidate passes the
later card-level trust filter. SQL set parity plus retaining those same downstream
filters preserves the published provider set.

All 10 launch counties and all 8 distinct hub slugs from launch-counties.ts were
audited, including the Broward alias and multi-county metros. Unique launch total:
**41,461 / 41,461 with canonical IDs**. Total verified FL candidate rows before
county restriction: **98,046**. Do not add hub counts together: metro and alias
scopes overlap.

Table columns:
- Existing = TOTAL_CURRENTLY_MATCHED_BY_EXISTING_LOGIC
- Canonical = MATCHED_BY_LAUNCH_COUNTY_ID
- Text only = MATCHED_ONLY_BY_TEXT_FALLBACK (neither canonical nor structured match)
- Missing = MISSING_LAUNCH_COUNTY_ID (absent, null or blank)
- Conflict = CONFLICTING_LAUNCH_COUNTY_ID (nonblank, not in this scope)
- Ambiguous text = AMBIGUOUS_TEXT_FALLBACK (text matches multiple launch counties)
- Duplicate IDs = DUPLICATE_PROVIDER_IDS

| Scope | County ID / hub slug | Existing | Canonical | Text only | Missing | Conflict | Ambiguous text | Duplicate IDs |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| county | broward | 7936 | 7936 | 0 | 0 | 0 | 0 | 0 |
| county | duval | 2696 | 2696 | 0 | 0 | 0 | 0 | 0 |
| county | hillsborough | 4352 | 4352 | 0 | 0 | 0 | 0 | 0 |
| county | miami_dade | 9630 | 9630 | 0 | 0 | 0 | 0 | 0 |
| county | orange | 4723 | 4723 | 0 | 0 | 0 | 0 | 0 |
| county | osceola | 1086 | 1086 | 0 | 0 | 0 | 0 | 0 |
| county | palm_beach | 5147 | 5147 | 0 | 0 | 0 | 0 | 0 |
| county | pasco | 1390 | 1390 | 0 | 0 | 0 | 0 | 0 |
| county | pinellas | 2992 | 2992 | 0 | 0 | 0 | 0 | 0 |
| county | seminole | 1509 | 1509 | 0 | 0 | 0 | 0 | 0 |
| hub | broward | 7936 | 7936 | 0 | 0 | 0 | 0 | 0 |
| hub | broward-county | 7936 | 7936 | 0 | 0 | 0 | 0 | 0 |
| hub | jacksonville | 2696 | 2696 | 0 | 0 | 0 | 0 | 0 |
| hub | miami-dade | 9630 | 9630 | 0 | 0 | 0 | 0 | 0 |
| hub | miami-fort-lauderdale | 22713 | 22713 | 0 | 0 | 0 | 0 | 0 |
| hub | orlando | 7318 | 7318 | 0 | 0 | 0 | 0 | 0 |
| hub | palm-beach-county | 5147 | 5147 | 0 | 0 | 0 | 0 | 0 |
| hub | tampa | 8734 | 8734 | 0 | 0 | 0 | 0 | 0 |

Global ambiguous rows (union of canonical, structured and text county matches):
**0**. Nonempty invalid/conflicting IDs: **0**. Missing IDs across *all* fallback
paths: **0**. Text-only rows requiring backfill: **0**. Safe backfill candidates:
**0** (derived from zero missing IDs). No candidate file was necessary.
No contact values or provider identifiers were exported.

Canonical matches are a subset of the existing OR by construction. Equal counts
per county therefore establish exact set equality, not just equal totals between
unrelated sets. Repeat this audit immediately before any future switch; today's
result is not ongoing certification or authorization.

## Prepared code and retained behavior

`lib/dfs/canonical-county-query.ts` builds dormant Supabase queries:
- exact HEAD count on providers (no estimate or cached substitute);
- `verified = true`, `states_licensed @> '{FL}'`;
- single county: `contact->>'launch_county_id' = county_id`;
- metro: the same expression with IN over the existing launch county list;
- row ordering: `name ASC NULLS LAST, id ASC`;
- inclusive row range supplied by the caller; invalid scope/range rejects.

It has **no production imports and no activation flag**. A later authorized
integration must retain the existing safe-page clamp/over-fetch, mapper,
trust/geography filters, exact count handling, error propagation and in-flight
joining. Builders return database errors; callers must check them as #107 does.
Do not treat this query builder as a replacement inventory loader.

Current production still uses the complete OR. Text-only/conflicting/ambiguous
fixtures remain visible through the actual live loader. The tests explicitly
demonstrate that a premature canonical-only switch would fail parity.

## Index contract and performance limitation

The originally suggested two-column index is **not sufficient for deterministic
name ordering**. A read-only grouping by canonical county ID and name found
**1,266 duplicate-name groups containing 10,050 providers**. Current name-only
pagination has ties; do not rely on PostgreSQL's internal tuple ordering.

Proposed replacement (review text only; not executed):

```sql
CREATE INDEX CONCURRENTLY idx_providers_fl_launch_county_name_id
  ON public.providers ((contact->>'launch_county_id'), name ASC NULLS LAST, id ASC)
  WHERE verified = true AND states_licensed @> '{FL}';
```

The partial predicate matches both prepared queries exactly. Contact is jsonb,
so the indexed expression is the native JSON text extraction used by PostgREST,
with no additional normalization/cast on the extracted county ID. The primary key
on id is unique. Name and id provide a total order under the database collation
for a fixed dataset (ordinary offset pagination can still move when rows change).

Single-county equality fixes the first index key, allowing ordered name/id scans.
For metro IN queries, a county-leading index **does not guarantee global name/id
order without a sort/merge**. The helper explicitly orders globally by name/id;
do not change the product's primary ordering to county merely to avoid a sort.
The index supports county restriction for these metros but their sort/count cost
must also be measured. Planner use is not guaranteed.

Catalog inspection found no existing launch-county expression index. A plan-only
canonical Miami-Dade row query still uses the states_licensed bitmap index,
estimates 101,176 FL rows before filtering, and sorts on name/id. That estimate
is not the audited 98,046 verified-FL actual count. It is not a runtime benchmark.
No hypothetical-index extension, index creation, ANALYZE or timeout change was
performed.

`EXACT_COUNT_WITH_CANONICAL_FILTER_EXPECTED_SAFE = UNPROVEN`
`EXACT_COUNT_CAN_REMAIN = UNPROVEN` (performance; exact semantics retained).

Next authorized DB review must validate the index and exact count under equivalent
anon RLS, the existing 3-second timeout, representative concurrency, first/deep
pages and all single/multi-county hubs in an isolated representative environment.
Measure count and rows separately and confirm SQLSTATE 57014 does not recur.
No reason to replace exact counts has been established.

References:
[PostgreSQL index ordering](https://www.postgresql.org/docs/current/indexes-ordering.html),
[partial-index predicate matching](https://www.postgresql.org/docs/current/indexes-partial.html),
[PostgREST JSON filters](https://docs.postgrest.org/en/stable/references/api/tables_views.html#json-columns).

## Backfill design — separate authorization required, currently a no-op

1. Re-run the read-only audit and freeze a dated before-count receipt. Enumerate
   candidates privately outside Git only if missing IDs reappear. Public receipts
   contain counts; a restricted candidate file contains provider ID + proposed
   county ID only, never contact values.
2. Require verified FL, an object-valued contact, a missing/null/blank canonical
   key, and exactly one county in the union of the *current* canonical/structured/
   text matching logic. Do not use the permissive substring matchLaunchCounty
   helper for assignment. Conflicting nonempty IDs, multiple counties, malformed
   JSON and uncertain free-text interpretations are held for evidence review.
   A text-only candidate must resolve uniquely and be confirmed against the
   current published tag/source evidence before approval. No ambiguous inference.
3. For an approved manifest, retain private rollback evidence: provider ID,
   target county ID, whether the old key existed, and its old JSON value. Never
   commit that record or print full contact objects. Validate candidate scope and
   evidence again in the future transaction; skip/hold any concurrently changed
   row rather than overwriting it. Compare-and-swap against the reviewed version.
4. Only after separate write authorization, update the single key using
   `jsonb_set(contact, '{launch_county_id}', to_jsonb(target_county_id::text), true)`
   on those approved, still-eligible rows. Preserve every unrelated JSON key.
   No provider creation/deletion, no replacement of the contact object. A repeat
   run finds the target key already assigned and does nothing.
5. Before committing that future transaction, require expected affected-row count,
   zero newly ambiguous/conflicting rows, unchanged provider IDs/row count and
   unchanged unrelated JSON keys. Compare old-logic versus canonical provider-ID
   sets **both directions per county and hub**, not only totals. Require exact
   counts and downstream card filtering parity; hold/rollback on any mismatch.
6. Explicit expected before/after for this snapshot:
   launch rows 41,461 -> 41,461; canonical present 41,461 -> 41,461;
   missing 0 -> 0; text-only 0 -> 0; ambiguous 0 -> 0;
   safe candidates 0 -> 0; expected updates **0**.
   If these numbers change, generate and review a new manifest/receipt.

## Rollback and STOP plan

Current draft needs no database rollback: it cannot switch the production path.
A future separately authorized query integration must be a distinct reversible
change. On missing parity, timeout/error regression, count drift, provider loss,
unstable pagination or false empty/noindex behavior: STOP and restore the current
legacy OR loader while preserving #107 fail-closed handling and #108 joining.
Do not mask lookup failures with empty data or raise the timeout.

For a future approved backfill rollback, address only manifest rows whose current
county ID still equals the value written by that operation. If originally absent,
remove only that key; otherwise restore its original JSON value with jsonb_set.
Preserve other keys, including unrelated edits made since the backfill. Hold any
concurrent county-key changes for operator review. Verify before/after counts and
provider-ID sets, and zero provider creation/deletion. The index is an additive
performance structure; do not automatically drop it on rollback. Any future index
removal requires a separate reviewed action.

## Validation

- `node --test scripts/test-fl-canonical-county-query.mjs scripts/test-fl-hub-lookup-errors.mjs`
  — **43 PASS / 0 FAIL** (14 new + all 29 existing #107/#108 cases).
- `node node_modules/tsx/dist/cli.mjs scripts/check-phase4-dfs.ts`
  — **PASS**, all 10 counties plus promotion/LOA/normalization checks.
- `node node_modules/typescript/bin/tsc --noEmit --incremental false`
  — **PASS** (exit 0).
- New tests exercise the real Supabase request builder against a local fake fetch;
  no live request or environment loading. They test all hub sets after simulated
  backfill, retained legacy fallback for held rows, exact count/query shape,
  genuine empty count, stable same-name/null pagination, no retries and errors.
- Existing tests exercise actual page + metadata failure/empty behavior and
  shared in-flight reads: no false empty/noindex regression.
- No package/workflow changes; focused command is explicit above.

PRODUCTION_MUTATIONS = 0. No DB writes, index creation, ANALYZE, timeout change,
merge, environment changes, production deployment or activation.
