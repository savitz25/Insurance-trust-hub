# TH-SEARCH-R1-013 release evidence

Status: READY FOR REVIEW. Production verification is pending; no future merge/deployment identity is asserted. The machine-readable [receipt](result.json) is authoritative for exact identities and final status.

## Scope and observed repair

Model: GPT-6 Astra / High ? USER-CONFIRMED, without independent session metadata. Fresh base `8051be7d5169929e42155cab81effa94178e8aad`; remote and ownership checked, no applicable AGENTS.md or overlapping assignment found. Only Insurance was edited. No database, schema, ingestion, publication, account or global changes occurred.

The [18-question baseline](baseline-matrix.md) records actual unchanged-main/Production behavior. Citizens' legal-insurer name returned an unrelated agency cohort; adding Florida discarded Gulfstream's name; local requests lost place/product context; appointed-with wording bypassed appointment evidence. Already-good exact identifiers remain recorded as GOOD. Deeper source verification found ignored directory ZIP equality and cross-issuer LOA qualification; neither was hidden behind the initial surface classification.

## Final contracts and boundaries

- **Intent, NPN, NAIC and names:** one shared validated request boundary; complete 180-character input is validated before truncation. Exact identifier families retain precedence and honest misses. Agency legal/display names and the permitted Wave-1 legal-insurer names produce bounded, explained candidates, with exact names first and stable server-revalidated selection. Names never merge source identities. No documented alias dataset was acquired or invented. Public person-name rosters and graph-agency profiles remain unavailable.
- **Directory/local refinement:** near-me and Boca Raton retain the requested location and receive a working ZIP entry. ZIP 33441 executes recorded address ZIP equality before pagination; the listing stays separate from the regulatory graph. Homeowners/life context remains visible and unresolved when no product filter is established. No ZIP guessing, city broadening, geocoding or service-territory claim. A normal document link preserves the selected handoff URL across refresh/history.
- **Regulatory semantics:** credential jurisdiction, recorded address, domicile, LOA, appointment and Marketplace overlay remain distinct. Texas LOA source issuer and credential jurisdiction are both constrained before totals/page selection. Appointment uses the indexed stable entity relationship and source carrier class; absence is not unauthorized. Marketplace observations are not state credentials or provider counts. Wave-1 publication/examination fields are not credential status/jurisdiction.
- **Recovery/coverage:** NOT_ACQUIRED, PARTIAL, UNKNOWN/source failure, unsupported conclusions and exact NO_MATCH remain separate. Existing state research and verified official actions preserve class/jurisdiction; a link does not establish current authority. [Official destination manifest](official-sources.json) includes purpose, jurisdiction, check time and limitations.
- **Trace/API/cache:** actual source-name field/value, source-native evidence, requested conditions, unresolved constraints and source clocks are additive to insurance-ask-v1. Page, public API and structured v2 share execution/validation; cache keys distinguish class, scope, evidence and request dimensions. Ask's adapter was inspected read-only; parent UI completion is not certified.

## Evidence and validation

[Source matrix](source-capability-matrix.md) and [independent oracle](source-oracle.json) document approved fields, publication scope, independent positives and file SHA256 fingerprints. Mutable database observations retain per-row source clocks and are not represented as a pinned full-corpus release.

60 focused behavioral checks pass. The initial target subset was 10 red / 2 already-green on unchanged main. All four deliberate mutations were detected and restored: agency?insurer, directory?graph, address?credential and LOA?appointment. [Mutation output](mutations.json), [clean gate](green-final.log), [regressions](regression-gates.json), [build](build-final.log) and [typecheck](typecheck-final.log) retain actual observations.

The 16 local native/API queries passed on `077e054`; first-interaction/history testing then found a real directory client-navigation bounce. After the minimal document-link repair, all eight navigation/Ask responsive checks passed on `833d3ac`, plus working official/state actions and directory overflow checks. Native query completion was 210?8,334 ms and API completion 23?4,125 ms in that local window. Whole multi-step flows take longer and are timed separately. [Final affected-flow proof](browser-local-833d3ac/result.json), [actions/320/768 directory proof](actions-local-833d3ac/result.json), [structured endpoint proof](structured-live.json). Earlier failed runs are retained; they are not certificates. Preview browser access requires Vercel authentication and was not bypassed. Preview build success is not browser proof.

Separate review was self-review plus automated behavioral/source/browser/CI checks, not independent human review. See [review findings](review.md). Full npm test and applicable Ask/capability/state/customer/claim/metrics/publication/SEO gates pass. Global ESLint's 15 errors/55 warnings and older homepage-fingerprint/appointment-label assertions fail identically on the exact baseline; no gate was weakened. Changed old expectations are documented against this ticket's requirements.

## Changed boundaries / rollback / remaining work

Runtime changes are in `lib/insurance-ask/*`, the existing national LOA source mapping, public-directory predicate adapter, structured v2 adapter, Ask/API/directory rendering and the shared search shell. The redundant nested footer anchor was removed because baseline hydration erased first input. CI, fixtures, QA scripts and evidence are scoped to this ticket. All runtime files are listed in PR #34.

Rollback is a reviewed Insurance-only revert/deployment of the ticket, preserving earlier state/publication releases; no database rollback is needed. Directory records contain inconsistent address fields and some legacy listing-quality issues; this ticket certifies ZIP equality, not every listing's geocoding/company relevance or product capability. Wider source acquisition, person/graph profile publication, parent Ask completion, other hubs and Move's pending canonical correction remain outside scope. Close only R1-013 after the Production receipt is complete.
