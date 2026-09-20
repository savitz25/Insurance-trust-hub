# TH-SEARCH-R1-019F — baseline receipt (written before any retrieval change)

- Insurance `origin/main`: `860345d85adcc2616efe5768acf5d941c7f8cf92`
- Open PR #55 (`mth-v2-insurance-save-b3`, head `84f54f5ac1fce816d58d9934650e17d3dc1ea806`, OPEN, not draft): My TrustHub
  Save only — `actions/my-insurance.ts`, `components/my-insurance/*`, `docs/my-trusthub/v2/*`, `scripts/*v2-save*`,
  `package.json`, `package-lock.json`.
- Overlap with required Search runtime files (`lib/insurance-ask/*`, `lib/specialist-execution/*`,
  `app/api/specialist-execution/*`, `app/ask/*`, `components/ask-insurance-result.tsx`): **none**.
  Only shared file: `package.json` (both add lines to `scripts`; PR #55 also adds an `esbuild` devDependency).
  This ticket adds exactly one `scripts` line and does not touch `package-lock.json`. Trivial textual merge, no runtime overlap.
- Fresh worktree `insurance-th-search-r1-019f`, branch `th-search-r1-019f-insurance-name-continuation`, from `origin/main`.
- Parent Ask (read only): `savitz25/Conumers-Trust-Hub` main `f6c0db64dd69f327ee5a9fd502c5a2daf752c6d6`.
- Existing gate `check:th-search-r1-013` on the untouched tree: 92 pass / 0 fail.

## Current behaviour (unmodified code; evidence in `red-baseline.json`, `red-baseline-structured-links.json`)

| Item | Observed |
|---|---|
| Native candidate cap | hard `ordered.slice(0, 10)`; `pagination.hasMore = false` always |
| Raw rows limited BEFORE the name predicate | each of the 4 source queries is `.limit(11)` on an `ILIKE %token%` substring superset, then the whole-word predicate runs. Real effect: **summit** has 97 true agency matches but the hub returns **9** and calls it truncated; **allied** 46 true → 10; **beacon** 46 true → 10 |
| Native `page=2` for a name | byte-identical entity ids to page 1 (`page2IdenticalToPage1: true`) |
| Structured v2 `page=2` for `identityName` | identical rows to page 1, `total: 10`, `hasMore: false` — a fake total and no continuation |
| Raw selection links, native surface (no options) | clean (`/ask?q=Find+allied&selected=<id>`), reopen correctly |
| Raw selection links, structured v2 surface | **10/10** contain `entity=undefined&state=undefined&loa=undefined` (v2 passes an options object with undefined values; `new URLSearchParams({...})` stringifies them) |
| Raw v2 link reopened with NO parent sanitation | `INVALID_INPUT` ("Invalid loa filter."), zero identities — the intended candidate is not reopened |
| Parent workaround | `safeHubUrl` drops `=undefined`/`=null` params; adapter treats `rows.length >= 10` as `truncatedWithoutCursor` with a generic `/ask?q=Find+<name>` handoff; never requests a second Insurance page |
| Native vs structured | same first 10 identities, but different action links (clean vs malformed) and neither can continue |

## Frozen multi-window term (frozen here, before retrieval is changed; never redrawn)

**`allied`** — real source, 46 distinct agency identities satisfy the existing whole-word predicate
(read-only probe, superset exhausted at 94 substring rows), i.e. five 10-candidate windows before any
published legal-insurer candidates are added. `beacon` (46) and `summit` (97) remain first-window controls.
