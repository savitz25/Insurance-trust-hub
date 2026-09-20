# TH-SEARCH-R1-019F — follow-up contract for parent Ask (READ-ONLY recommendation; parent was not edited)

Parent inspected: `savitz25/Conumers-Trust-Hub` @ `f6c0db64dd69f327ee5a9fd502c5a2daf752c6d6`,
`lib/network/name-candidates/adapters.ts` (`insuranceNameAdapter`, `safeHubUrl`, `HUB_PAGE_SIZE = 10`).

## What the parent does today
- Calls Insurance `trusthub-specialist-execution-v2` with `{ identityName, limit: 10 }` — never a page.
- `safeHubUrl` strips `=undefined` / `=null` parameters from Insurance `selectionUrl`s (the workaround).
- Treats `rows.length >= 10` as `truncatedWithoutCursor` and offers only a generic `/ask?q=Find+<name>` handoff.
- Pins v2 `schemaFingerprint 4aa93bb372aebb45c7028b750000e77be4a847d9a210f3c40d3db1df1f7f637f` — **unchanged by this ticket**, so
  the current parent keeps working against the new hub with no edit (and now receives clean links).

## New operation the follow-up ticket should adopt
| | |
|---|---|
| Endpoint | `POST https://www.insurancetrusthub.com/api/specialist-execution/name-candidates/v1` (`GET` with no params = capability document) |
| Contract / version | `insurance-name-candidates-v1` / `1.0.0` |
| Schema fingerprint | `c272675bdde4adab8d6672be7fb3143319ada5ec5e61dcf72dc7cda295b0d62f` |
| Request | `{ "operation": "name_candidates", "name": "<text>", "page"?: 1..200, "limit"?: 1..10, "entityClass"?: "agency" \| "legal_insurer" }` — unknown fields are rejected, nothing is ignored |
| Name proof | `name.supplied` (whitespace-collapsed echo), `name.normalized`, `name.distinctiveTokens`, `name.predicateApplied === true` on every searched response (false on refusals/failures) |
| Continuation | deterministic page continuation: `pagination.hasMore`, `pagination.nextPage` (null when none). Request `page: nextPage` with the same `name` and `limit`. Match-first, one ordered stream; no identity repeats across pages |
| Totals | `pagination.matchedCount` is a number **only** when `matchedCountIsExact` is true (`completeness: "COMPLETE"`); otherwise `null`. Never infer a total from `returned` |
| Candidate | `stableKey` (`insurance:agency:<uuid>` \| `insurance:legal_insurer:<uuid>`), `entityClass`, `displayName`, `npn`, `naicCode`, `match{field,value,method}`, `publicationState`, `action{type,url}`, `profileUrl`, `selectionUrl`, `whyMatched` |
| Action | `action.type = "PROFILE"` + published `/insurers/<slug>` only when `publicationState = "PUBLIC_PROFILE"`; otherwise `"RESEARCH"` + the hub-owned, server-revalidated `/ask?q=Find+<name>&selected=<uuid>`. Relative URLs; resolve against the Insurance origin |
| Suppression | `pagination.suppressedByPublicationPolicy` = rows on this page withheld by the bail-bond publication rule (so `returned` may be < `limit` while `hasMore` is true) |

### Result states → parent outcome (proposed mapping)
| HTTP | `resultState` | Parent state |
|---|---|---|
| 200 | `CANDIDATES` | `COMPLETED_WITH_CANDIDATES`, or `PARTIAL_TRUNCATED` with `hasMore: true` + real next page when `pagination.hasMore`; an `outOfRange` page has `returned: 0` and is NOT a miss |
| 200 | `NO_MATCH` | `COMPLETED_NO_CANDIDATES` (only state that is a completed miss; `matchedCount: 0`, `predicateApplied: true`) |
| 200 | `PARTIAL_REFINE_REQUIRED` | `PARTIAL_TRUNCATED` with `truncatedWithoutCursor` semantics once `hasMore` is false: scan bound reached, ask the user to refine; never "complete" |
| 400 | `INVALID_REQUEST` | `TECHNICAL_FAILURE` / adapter defect (or `UNSUPPORTED_OPERATION` for `no_distinctive_name_word`) |
| 422 | `UNSUPPORTED_OPERATION` | `UNSUPPORTED_OPERATION` (input is not read as one organization name) |
| 422 | `RESTRICTED_SCOPE` | `POLICY_RESTRICTED` (individual producers are not name-searched) |
| 503 | `SOURCE_UNAVAILABLE` | `TECHNICAL_FAILURE: unavailable` — never a miss |
| 504 | `TIMEOUT` | `TECHNICAL_FAILURE: timeout` — never a miss |

## Exact parent changes for the follow-up ticket (small, deterministic)
1. Add `INSURANCE_NAME_CANDIDATES_LOCK = { url, version: '1.0.0', schemaFingerprint: 'c272675b…d62f' }` beside `LENDER_NAME_CANDIDATES_LOCK`.
2. Re-point `insuranceNameAdapter.search(name, page)` at the new endpoint with `{ operation: 'name_candidates', name, page, limit: HUB_PAGE_SIZE }`
   — the same shape the Lender adapter already uses; validate contract/version/fingerprint, `name.predicateApplied`, and `echoesName(name.supplied, name)`.
3. Replace the `capped = rows.length >= HUB_PAGE_SIZE → truncatedWithoutCursor` rule with `hasMore: pagination.hasMore === true`
   (and `truncatedWithoutCursor` only for `PARTIAL_REFINE_REQUIRED` with no `nextPage`). Drop the generic `/ask?q=Find+<name>` continuation.
4. Build the candidate action from `action` (`PROFILE` → `profileUrl`, `RESEARCH` → `selectionUrl`), key on `stableKey`. `hubReportedTotal` = `matchedCount` only when `matchedCountIsExact`.
5. Update `insuranceBase.matchBreadth` ("capped at 10 per request" is no longer true).
6. `safeHubUrl`'s `=undefined`/`=null` stripping may stay as defence-in-depth; Insurance no longer needs it (gate check 12/13, real-source green: 0 malformed links).

No change to v2 consumers (identifier / cohort / evidence / directory) is required.
