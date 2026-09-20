# TH-SEARCH-R1-019F — Insurance name discovery: continuation, link integrity, native parity

Evidence index (red evidence is never overwritten by green output):

| File | What |
|---|---|
| `baseline-receipt.md` | SHAs, PR #55 overlap audit, current behaviour, **frozen multi-window term (`allied`)** — written before retrieval changed |
| `red-baseline.json` | RED, unmodified `860345d`: real candidate-set sizes (allied 46 / beacon 46 / summit 97), 10-row cap, summit shows 9, native page 2 == page 1, v2 page 2 == page 1 with `total: 10`, v2 10/10 links with `=undefined` |
| `red-baseline-structured-links.json` | RED: raw v2 selection URLs reopened with no parent sanitation -> `INVALID_INPUT`, intended identity not reopened |
| `holdout-frozen.json` | 39-case frozen organization-name holdout, drawn from the source (not the engine) before evaluation |
| `holdout-results.candidate-1.json`, `holdout-results.final.json` | one pass each; both 35/35 recalled, 0 wrong identity on misses, 0 duplicates, 0 source failures, 0 malformed links, 0 native/structured or continuation disagreements |
| `green-acceptance.candidate-1.json`, `green-acceptance.final.json` | real-source GREEN: allied 46 over 5 windows, beacon 46 over 5, summit 97 over 10; identical streams in both passes |
| `mutation-report.json` | 11/11 mutations detected by assertions (gate ran to completion each time), bytes restored |
| `browser-qa.final.json`, `browser-final-{1280,390,320}.png` | real Chromium, typed + Enter / clicks / Back / Forward / reload / 3 viewports: 17/17 |
| `PARENT-ASK-FOLLOWUP.md` | read-only recommendation for the parent Ask adapter (parent not edited) |
| `r1-v2-exact-total.red-905e9d9.json` | **RED, R1**, pre-fix `905e9d9`: real `V FINANCIAL LLC` (only distinctive word "financial") reaches `SCAN_BOUND_REACHED`; v2 nonetheless returned HTTP 200 `AMBIGUOUS_IDENTITIES` with `total: 4960` — a success-shaped, inexact numeric total, violating v2's documented exact-total contract |
| `r1-v2-exact-total.green-r1.json` | **GREEN, R1**: same case now returns v2 HTTP 422 `UNSUPPORTED_CAPABILITY` / `name_search_refinement_required`, `rows: []`, `total: 0`, explicit "not a no-match" limitation; sibling stays `PARTIAL_REFINE_REQUIRED` / `matchedCount: null`; native keeps its 10 bounded results with a refine disclosure; allied/beacon/summit (all `COMPLETE`) remain ordinary v2 successes with `total` equal to the sibling's exact `matchedCount`, and v2 fingerprints unchanged |

## Design in one paragraph
One engine (`lib/insurance-ask/name-candidates.ts`): read the source superset to its end in 500-row batches ->
apply the unchanged `matchSourceName` predicate to every row -> one candidate per class-qualified identity
(`agency:<id>` / `insurer:<id>`, strongest field evidence kept) -> deterministic code-unit order with a stable-key
tie-break -> only then cut the window. Native `/ask`, v2 `identityName`, and the new sibling
`insurance-name-candidates-v1` are adapters over `searchInsuranceNameCandidates`. Continuation is a deterministic
page number. `matchedCount` is a computed count only when the superset was exhausted (`COMPLETE`); if the
5,000-row-per-field scan bound is reached it is `null`, the state is `PARTIAL_REFINE_REQUIRED`, and nothing resembling a
census is emitted. A source error throws on every path. Hub links come from one builder (`insuranceAskHref`) that
appends a parameter only when it holds a real value.

## Decisions a reviewer may want to look at
1. **Published-insurer prefilter removed from the name path.** `searchPublishedInsurers` needs 8+ characters for a
   containment hit, so a published Wave-1 insurer satisfying `matchSourceName` through a shorter word (e.g. "ocean
   harbor") was dropped before the predicate ran. The engine now hands all 26 published insurers to the one predicate.
   Same predicate, same cohort, no fuzzy rule; one-line revert in `nameSource().publishedInsurers` if unwanted.
2. **Ordering** moved from host-locale `localeCompare` to code-unit order on the normalized name (then raw name, then
   stable key) so windows are reproducible on any runtime. Exact normalized matches still lead.
3. **v2 name path**: `page` is now a real window and `pagination.hasMore` is the engine's; contract, version and both
   fingerprints are unchanged (`4aa93bb3…`, the value parent Ask pins). Identifier / cohort / evidence / directory
   branches are untouched. **R1 correction**: v2 documents *exact* totals, so a name whose source scan hit its bound
   (`completeness !== 'COMPLETE'`) no longer returns a success-shaped response with an inexact `total` — it fails
   closed through the existing `UNSUPPORTED_CAPABILITY` state (`name_search_refinement_required`, HTTP 422, explicit
   "not a no-match" limitation, `rows: []`/`total: 0` as the standard empty envelope values, not a finding). The
   sibling contract (`insurance-name-candidates-v1`) and native `/ask` continue to serve this case honestly.
4. Worst-case latency (scan bound reached, e.g. a name whose only distinctive word is "financial") was ~8.8 s
   sequential; the two source-name fields are now read concurrently. Typical names: 1.3–2.2 s against the real source.
5. `package.json` gains one `scripts` line; PR #55 also edits `package.json` (different lines) — trivial textual merge.
6. **Bail-bond publication review (R1)**: `INS-DIR-BAIL-001` retains bail-bond evidence and bars it from
   consumer-directory *listings*; it is not a research-identity exclusion. Native `/ask` therefore still shows a
   bail-bond identity as a research row (no `href`, per the existing "research identity" note). Both network
   surfaces (v2 and the sibling) withhold it from the returned page — following the released v2 precedent
   (`bailRowsSuppressedOnPage`) — while keeping it in the one underlying candidate stream, so `matchedCount`,
   continuation and ordering are identical to native's. The sibling discloses the count withheld via
   `pagination.suppressedByPublicationPolicy` and a new limitation. This is publication filtering applied to what
   each *page* returns, not to matching/counting, which is deliberate: changing it to filter before counting would
   make `matchedCount`/continuation disagree between native and network surfaces for the same identity graph, and
   is a distinct legacy publication-policy decision this ticket does not reopen.
