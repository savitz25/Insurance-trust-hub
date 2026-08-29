# INS-HOME-002 — National homepage refinement

Refinement, honesty, accessibility, responsive quality, and closure. `db_writes = 0`. Payload unchanged.

## A. STATUS

**COMPLETE WITH BLOCKERS** until Preview visual QA and Production promotion land. Local production-build visual QA at 1440 / 768 / 390 / 360 is PASS.

## B. RELEASE

| Field | Value |
|---|---|
| Starting SHA / `origin/main` | `281c52d112ea5187ef31b9d3397c820a55a3f2da` |
| Branch / worktree | `ins-home-002-national-home-refinement` / `C:\Users\makei\insurance-trust-hub-intel-006` |
| Implementation SHA | *(commit after this doc is staged)* |
| Final `origin/main` | *(after merge)* |
| Preview | *(Vercel Preview URL)* |
| Production | https://www.insurancetrusthub.com |
| Rollback SHA | `281c52d112ea5187ef31b9d3397c820a55a3f2da` |
| Previous Production deployment | git-main alias at `281c52d` (INS-HOME-001 audit) |

## C. BASELINE LOCK

| Item | Locked value |
|---|---|
| Contract | `insurance-home-intel-v1` |
| Homepage fingerprint | `934a48723912a0bb514f5c5589d9dbd6f682e70af9b9473be3dd8713ff2073d9` |
| Story #2 SQL lock | D1=D2=82,071 · D3=109,927 · D4=117,354 · buckets 62,202 / 13,289 / 6,546 / 34 / 0 |
| Legal insurers | 6,185 (homepage grain) |
| Public people | 0 |
| Florida snapshot | `insurance-fl-state-intel-v1` |
| Florida fingerprint | `8021301d48bd509b30fa4639e74c777bfbbd82a6f0cd12a2f80a11e05b415d93` |
| `home-intel.ts` numbers | **unchanged** |

`lib/national/home-intel.ts` finding titles, summaries, and series were not edited. Fingerprint remains `934a4872…`.

## D. UI CHANGES

| Surface | Change |
|---|---|
| Hero ZIP panel | Heading is “Public directory listings.” Copy states ZIP lookup of directory records, not all graph agencies / producers / legal insurers, and not a ranking. |
| Directory CTA | “Research licensed agencies” → “Browse public directory listings” → `/directory`. |
| ZIP form | `aria-label` + input label for public directory listings; submit “Search listings”; 5-digit validation with `role="alert"`; `aria-pressed` on type chips. |
| State of Record | Consumer sublabels: people pages 0; 82,071 graph agencies ≠ 170,499 listings; 6,185 legal insurers ≠ 13,547 `entity_kind=carrier`. |
| Story tables | Per-finding count header: Entities / Agencies / LOA observation rows. |
| PWA install banner | `box-border max-w-full min-w-0`; close `shrink-0` — root cause of ~69px iOS overflow at 390px. |
| Header / root | `.th-header-inner` `min-width: 0; max-width: 100%`; `html`/`body` `overflow-x: clip` as a last-resort clip, not the primary fix. |

No new routes. No quote-funnel homepage. No ranking chrome.

## E. ZIP SEARCH HONESTY

| | |
|---|---|
| Old heading | Agency directory lookup |
| Old CTA | Research licensed agencies |
| Old implication | Live search of licensed agencies (easy to confuse with 82,071 graph agencies) |
| New heading | Public directory listings |
| New form copy | Search public insurance directory listings by ZIP. Not a search of all graph agencies, producers, or legal insurers. Not a ranking. |
| New CTA | Browse public directory listings |
| Destination | `/directory?verified=true` (optional `zip=` 5 digits) |

Consumers can see 170,499 directory listings next to 82,071 graph agencies on the same page, with explicit “not the 170,499 public directory listings” on the agency card.

## F. ENTITY-CLASS CLARITY

| Class | Homepage treatment |
|---|---|
| Carrier / legal insurer | 6,185 legal insurer identities. Distinct from 13,547 `entity_kind=carrier` rows. Public legal-insurer pages = 0. Glossary: legal insurer underwrites a policy. |
| Agency | 82,071 graph agencies with attached-credential evidence. Public graph-agency profiles = 0. Distinct from directory listings. |
| Producer | 1,029,860 graph persons. Public people pages remain 0. Not a public people directory. |

Glossary block (Carrier / Agency / Producer / NPN / NAIC / LOA / Appointment / Domicile / Marketplace / Medicare Advantage) retained.

## G. THREE STORY REGRESSION

| Story | Status |
|---|---|
| #1 Insurance is a network, not one company list | Intact. Table count header is **Entities**. |
| #2 Some agencies hold credentials across multiple states | Intact. SQL-locked buckets. Table count header remains **Agencies**. LICENSED_IN ≠ SERVES. |
| #3 Lines of authority matter — and they are not one national taxonomy yet | Intact. Table count header is **LOA observation rows**. |

**NATIONAL PERSON PRODUCT-LINE CHART: NOT PRESENT.**

## H. PAYLOAD / FINGERPRINT

`buildInsuranceHomeIntelV1()` still emits fingerprint `934a48723912a0bb514f5c5589d9dbd6f682e70af9b9473be3dd8713ff2073d9`. `generatedAt` excluded. `db_writes = 0`.

## I. TRACE / EXPLAIN

`Trace this number` (`insurance_intel_trace_number`) and `Explain this chart` (`insurance_intel_explain_chart`) remain keyboard-operable `<details>`. Trace still includes Retrieved / generated.

## J. MOBILE OVERFLOW

INS-HOME-001 recorded ~69px overflow at 390px (`scrollWidth` 459 vs `clientWidth` 390) from the iOS PWA install banner (`fixed inset-x-0`).

| Viewport | Before (audit) | After (local production build) | document scrollWidth | overflow |
|---|---|---|---|---|
| 390 × 844 (iOS UA, PWA banner shown) | 459 > 390 FAIL | innerWidth 390, clientWidth 390 | 390 | PASS (delta 0; banner width 390; visual overflow 0) |
| 360 × 800 (iOS UA, PWA banner shown) | — | innerWidth 360 | 360 | PASS |
| 768 × 1024 | PASS | innerWidth 768 | 768 | PASS |
| 1440 × 900 | PASS (1425 / 1440) | innerWidth 1440, clientWidth 1425 | 1425 | PASS |

Root causes fixed: iOS PWA install banner box model, and unbreakable Florida fingerprint hex in the sources footer (`break-all`). `html`/`body` `overflow-x: clip` remains a last-resort clip. Not `overflow-x: hidden` on the homepage article.

Fix is box-model on the banner + `min-w-0` on cards/tables, not `overflow-x: hidden` on the homepage article.

## K. ACCESSIBILITY

- One H1: “Understand the insurance market through public regulatory evidence.”
- ZIP form and input have accessible names; invalid ZIP uses `role="alert"`.
- Type chips expose `aria-pressed`.
- Skip-to-content retained.
- Trace/Explain `min-h-11` hit targets retained.
- Finding tables: captions + `scope`; count header matches grain.
- No color-only meaning on story bars (table + list remain).

## L. SEO

Homepage metadata unchanged: title “Insurance Licensing & Regulatory Intelligence”; `path: '/'`; `index, follow` on Production; “No paid rankings.” Canonical remains `https://www.insurancetrusthub.com/`. No new sitemap URLs. No `/texas` intelligence route.

Preview hosts must remain `X-Robots-Tag: noindex` (Vercel Preview).

## M. PERFORMANCE

| Item | Result |
|---|---|
| Server aggregate | Precomputed `insurance-home-intel-v1` (no browser query of millions of rows) |
| Client query | ZIP form is client navigation only; no homepage graph query |
| First-load `/` | Production build: **2.47 kB** route, **228 kB** First Load JS |
| Caching | Static `○ /` prerender |
| `next build --turbopack` | PASS (Next.js 15.5.19) |

## N. TESTING

| Command | Result |
|---|---|
| `npm run check:ins-home-002` | PASS (RED then GREEN) |
| `npm run check:ins-home-004` | PASS |
| `npm run check:ins-home-003b` | PASS |
| `npm run check:ins-home-006` | PASS |
| `npm run check:ins-nat-012` | PASS |
| `npm run check:fl-ins-007` | PASS (25) |
| `npm run check:ins-home-003` | PASS |
| `npx tsc --noEmit` | PASS |
| `npm run build` | PASS |
| `npm run lint` | **FAIL (pre-existing, unrelated)** — 66 problems (14 errors, 52 warnings). None in INS-HOME-002 files. Errors include `actions/my-insurance.ts` explicit any, DFS/TDI audit scripts, `require()` in CJS installers, prefer-const in national backfill scripts. **Not hidden; not fixed in this task.** |
| Changed-file eslint | PASS on homepage/ZIP/PWA/check script |

## O. PUBLICATION REGRESSION

| Metric | Expected |
|---|---|
| `db_writes` | 0 |
| New people | 0 |
| New graph agencies | 0 |
| New insurers | 0 |
| New URLs | 0 |
| Wave 2 | not started |

## P. FLORIDA REGRESSION

| Item | Result |
|---|---|
| Contract | `insurance-fl-state-intel-v1` untouched |
| Fingerprint | `8021301d48bd509b30fa4639e74c777bfbbd82a6f0cd12a2f80a11e05b415d93` |
| UI changed | No |
| `check:fl-ins-007` | PASS |

## Q. REMAINING HOMEPAGE GAPS

True future gaps only — not this task:

1. Public person pages remain 0 (correctly gated).
2. Public legal-insurer pages remain 0.
3. Homepage still has no NPN / NAIC / carrier-name search.
4. `WORKS_FOR` remains 0; employment cannot be shown.
5. No additional live state intelligence pages beyond `/florida`.
6. No national person LOA product-line chart (intentionally prohibited).

Do not use INS-HOME-002 follow-up as an excuse to start Wave 2 publication.

## R. CLOSURE RECOMMENDATION

Pending Preview + Production visual verification. If those pass:

**INSURANCETRUSTHUB NATIONAL HOMEPAGE: OPERATIONALLY CLOSED**

Bounded next task if a visual/SEO issue is found on Preview: name it in the final AG report; do not expand into person publication.
