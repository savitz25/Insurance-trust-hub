# Insurance PR #55: confirmed per-card read correction

Review baseline: `58446e4d8c585bfc2c3c3f775f54d98cdbf956d6`.
Scope: account-confirmation reads only; no V2-3 adapter or backend changes.

## Reproduction before runtime edits

Loopback Chromium fixture rendered 48 real SaveProviderButton components with
signed-in auth and delayed cloud actions mocked. It recorded 48 identical
`listSavedProviderSlugsAction(owner)` calls. The new regression fails against
the exact review baseline with `48 !== 1`.

Reproduce using `node scripts/qa-v2-save.mjs --review-baseline`, then
`npm run test:v2-save:browser`. Stop that fixture and run `npm run qa:v2-save`
without the flag to verify the corrected component. Agent-browser must be on PATH
or provided through AGENT_BROWSER_BIN. No external backend or credentials used.

## Correction

Existing MyInsuranceProvider invokes one owner-bound confirmation hook. Controls
consume its shared snapshot instead of issuing individual server actions. The
cloud/local union is still NOT account-persistence proof. The snapshot belongs to
one provider/auth tenure, not a global cache; owner/loading changes invalidate it,
stale completions are ignored, and StrictMode effect replay shares its request.
Late-mounted cards reuse the snapshot. Removal forgets confirmation, including
while the initial read is pending. Local Save stays actionable during the read;
accessible pending feedback avoids presenting an unresolved account state as final.

This removes 47/48 (97.9%) of the added card-confirmation requests for the measured
48-card fixture. Existing navbar/auth-continuity requests are outside this change:
this is NOT a claim of one total request per application load or a latency benchmark.
Save mutations, local storage, notes, plans, caps, dynamic directory wrapper,
server-side expected-owner checks and admission policy are unchanged.

## Verification

Windows / Node 22.18.0; actual Chromium controls/localStorage; auth/cloud MOCKED.

- N1-01: 48 cards share one delayed confirmation read, pending status accessible,
  local Save not disabled — PASS.
- N1-02: late card mount adds zero reads; removed confirmation not reused — PASS.
- N1-03: owner switch makes one new read; logout rejects stale result — PASS.
- N1-04: failed read does not create retry fan-out or block local Save — PASS.
- Complete existing browser matrix: reload/device disclosure, confirmed-account
  disclosure, duplicates, storage/cloud failures, delayed auth, owner/profile races,
  keyboard/focus and 1440/390/320 fixture checks — PASS.
- `npm run check:v2-save`: six focused tests PASS.
- `npm test`: PASS.
- `npx tsc --noEmit --pretty false --incremental false`: PASS, zero diagnostics.
- Changed-file ESLint: PASS, zero diagnostics.
- `npm run lint`: existing 70 diagnostics (15 errors / 55 warnings); no cleanup.
- `npm run build`: PASS. `git diff --check`: PASS.

## Builder 4 re-QA request

Use the new immutable head posted on PR #55, not the review baseline. Repeat the
commands above, plus guest profile reload/disclosure and directory delayed-loading
checks. Inspect real directory behavior using an already authorized preview session;
do not authenticate unless backend isolation is independently established.
Real authenticated database journey and full eligible directory preview journey
remain NOT RUN here; the component fixture is not a substitute certification.
Keep the review finding open for independent re-QA. No merge/deploy/provisioning,
production mutations or Insurance/Lender V2-3 adapter work. Move #157 unchanged.
