# INS-HOME-001 — National homepage intelligence baseline audit

Audit-first. No Production homepage change. `db_writes = 0`.

## A. STATUS

**COMPLETE**

`insurance-home-intel-v1` already exists in Production. This audit locks what it may truthfully expose. INS-HOME-002 should implement from this contract, not guess.

## B. REPO / PRODUCTION BASELINE

| Field | Value |
|---|---|
| Repo | https://github.com/savitz25/Insurance-trust-hub |
| Reference SHA | `ec955fc39927258aa5090024362c1a6106339d1f` |
| Starting / `origin/main` | **same** `ec955fc` |
| Branch / worktree | `ins-home-001-national-home-audit` / `C:\Users\makei\insurance-trust-hub-intel-006` |
| Canonical | https://www.insurancetrusthub.com |
| Apex | https://insurancetrusthub.com aliases to the same Vercel project |
| Vercel team | `savitz25-s-projects` / `team_1vxGqSSLGF4xmg7XRqpkLSKi` |
| Project | `insurance-trust-hub` / `prj_ARBlfWYNhpJWBtaPO4vUJlraa5BK` |
| Framework | Next.js 15 (root) |
| DB | Production Supabase `gojyhmbojbwbpiamoktq` via `SUPABASE_URL` + service role (read-only here) |
| Homepage contract | `insurance-home-intel-v1` |
| Homepage fingerprint | `934a48723912a0bb514f5c5589d9dbd6f682e70af9b9473be3dd8713ff2073d9` |
| Florida snapshot | `insurance-fl-state-intel-v1` |
| Florida fingerprint | `8021301d48bd509b30fa4639e74c777bfbbd82a6f0cd12a2f80a11e05b415d93` |
| Production vs main | git-main alias served `www.insurancetrusthub.com` after `ec955fc` (no unexplained fork) |
| Preview | `X-Robots-Tag: noindex` on preview hosts; Production `/` is `index, follow` |

Screenshots (live Production, not modified):

- `docs/ins-home-001-screenshots/desktop-1440.png`
- `docs/ins-home-001-screenshots/tablet-768.png`
- `docs/ins-home-001-screenshots/mobile-390.png`

Census JSON: `data/reports/ins-home-001-census.json`

## C. CURRENT HOMEPAGE

| Item | Production fact |
|---|---|
| Route | `/` — `app/page.tsx` |
| Component | `InsuranceHomeIntelligence` (server-rendered via `loadInsuranceHomeIntel()` / `server-only`) |
| Data | Precomputed `buildInsuranceHomeIntelV1()` — **no browser query of millions of rows** |
| H1 | Understand the insurance market through public regulatory evidence. |
| Title | Insurance Licensing & Regulatory Intelligence |
| Robots | `index, follow` |
| Canonical | `https://www.insurancetrusthub.com/` |
| Search | ZIP → `/directory?verified=true` (agency **provider listings**, not graph agencies, not NPN, not 6,185 insurers) |
| Stories | 1 network · 2 multi-state licensing (SQL-LOCKED) · 3 LOA not one taxonomy |
| JSON-LD | `buildHomepageGraph()` |
| Trace / Explain | `insurance_intel_trace_number` / `insurance_intel_explain_chart` |

**KEEP:** Intelligence OS chassis, entity-class census cards, three stories, evidence depth, limitations, glossary, Florida as only live state intelligence, ZIP directory CTA with honest grain.

**MODIFY (INS-HOME-002):** ZIP copy can over-imply “licensed agencies” vs directory listings; table header “Count” vs credential rows vs agencies; inherited My Insurance mobile overflow (~69px at 390).

**REMOVE:** Do not restore quote-funnel/lead-gen homepage. `quote-comparison` route exists as a tool — do not promote as research ranking.

**MISSING for a later OS pass:** carrier-name/NPN/NAIC search; public person/legal-insurer pages (correctly gated at 0).

## D. NATIONAL ENTITY CENSUS

Verified Production (2026-08-29), `db_writes = 0`. Do **not** use stale 81,943 / 13,461.

| Class | Count | Meaning |
|---|---:|---|
| Canonical agencies | **82,071** | `national_entities.entity_kind=agency`. All have NPN in this extract. |
| Canonical persons | **1,029,860** | `entity_kind=person`. All have NPN. Public people **0**. |
| Legal insurers | **6,185** | Homepage grain. **Not** `entity_kind=carrier` (13,547). |
| `entity_kind=carrier` | 13,547 | Separate graph kind (appointing/provisional). Do not add to 6,185. |
| Public directory providers | 170,499 | Listing surface, **not** graph-agency profiles (0). |
| Credentials | 1,531,158 | agency 117,354 + person 1,413,804; unattached 0 |
| LOA observations | 1,791,158 | person + agency; see G/H |
| CMS Marketplace observations | 1,300,108 | federal lane |

**Do not sum** agencies + persons + legal insurers.

## E. IDENTIFIER READINESS

| Identifier | Source | Notes |
|---|---|---|
| NPN | `national_entities.npn` | Canonical person/agency anchor in this graph. 100% filled for both kinds in census. Search UI does **not** expose NPN lookup on homepage. Safe to show on future profiles when published. |
| License number | `license_credentials.license_number` | State-scoped unique with namespace. Tool: `/tools/license-verification`. |
| NAIC / company codes | `national_entity_identifiers` (8,802 rows) | Legal-insurer identity. Not homepage search. |
| Provisional keys | `provisional_key` | Source-scoped; not public identity. |

No new name/email/phone joins in this task.

## F. STATE LICENSING READINESS

Credential **rows** by jurisdiction: FL 750,316 · TX 718,894 · VT 50,514 · MA 7,187 · OH 4,247. Other states: 0 rows in this graph (not “no market”).

Agency credentials 117,354 from FL/TX/VT/MA/OH source families. Florida agency **status is UNKNOWN** — not inferred inactive. **No national “active license” denominator.**

## G. AGENCY LOA READINESS

INS-HOME-004: L1=69,545 agency LOA rows (TX 50,348 · MA 19,177 · VT 20). FL/OH agency LOA rows = 0. Texas composites must not be split. Story: **source-specific taxonomy**, not national Life/Health/Property %.

## H. PERSON LOA READINESS

INS-NAT-012 artifact `ins-nat-012-person-loa-v1`, fingerprint `58f08afe5911ab36762e5829190540c2964099c8754884b9fd0389e76e50e3c3`.

P1=P2=1,721,613 · P4 unique persons 1,029,860 · public people **0**.

**NATIONAL PRODUCT-LINE CHART: NO.**

Florida TYCL ≠ Texas bundled qualifications ≠ Vermont atomic lines. Status UNKNOWN (FL/VT) vs UNKNOWN+expired (TX).

## I. APPOINTMENT READINESS

| Type | Count | Grain |
|---|---:|---|
| `APPOINTED_TO` | 7,334,179 | largely person (FL/TX individual appointments) |
| `appointed_by` | 2,680 | agency (Florida DFS) |
| Appointment ≠ employment, ≠ NAIC identity, ≠ statewide service. **STATE-DEPENDENT.** |

## J. AFFILIATION READINESS

`WORKS_FOR` = **0**. `ASSOCIATED_WITH` = 52,827 (source-specific). Do not infer employment from appointment or shared contact.

## K. MARKETPLACE READINESS

1,300,108 `cms_marketplace_observations`, Plan Year 2026 on homepage. Language: **Marketplace registration evidence**, not “Marketplace Certified.” Separate from DOI licensing. **PARTIAL / READY as overlay only.**

## L. MEDICARE READINESS

Live tools: `/medicare`, `/tools/medicare-plan-finder`, complaint index. Not legal-insurer pages. Keep visually separate from ACA and DOI. **PARTIAL.**

## M. REGULATORY / ENFORCEMENT READINESS

`regulatory_evidence` 5,978 rows; publication_readiness exists; homepage treats complaints as INTERNAL_ONLY / not a national enforcement census. **Complaint ≠ violation. No event ≠ clean record.**

## N. COMPLAINT READINESS

`/data/plan-complaint-index` exists. No defensible national complaint **rate** denominator on homepage. Use **observations**, never Complaint Grade. **NOT READY** for ranked complaint story.

## O. CORPORATE / DOMICILE READINESS

Homepage: “Not yet researched” as V1 national metric. Domicile ≠ service territory. **NOT READY** as a featured story.

## P. MULTI-STATE LICENSING READINESS

**READY** (SQL-LOCKED, INS-HOME-003B).

D1=D2=82,071 · D3=109,927 · D4=117,354 · buckets 62,202 / 13,289 / 6,546 / 34 / 0. Five ingested agency credential states only. LICENSED_IN ≠ SERVES. Attached credential evidence ≠ active national licenses.

## Q. SEARCH READINESS

| Query | Homepage / live? |
|---|---|
| Agency directory ZIP | YES → `/directory` listings |
| Graph agency / person / NPN | NO on homepage |
| NAIC / 6,185 insurers | NO |
| License number | `/tools/license-verification` |
| Carrier brand pages | `/carriers/[slug]` Medicare-evidenced rollups, not 6,185 legal insurers |

## R. PUBLIC TOOL / ROUTE INVENTORY

| Route | Class |
|---|---|
| `/` Intelligence OS | LIVE |
| `/directory` | LIVE BUT LIMITED (listings ≠ graph agencies) |
| `/florida` | LIVE (state intel; locked) |
| `/methodology` | LIVE |
| `/medicare`, marketplace tools, Coverage Compass | LIVE BUT LIMITED |
| `/my-insurance`, compare | LIVE (research passport) |
| `/carriers` | LIVE BUT LIMITED |
| Public person / legal-insurer graph pages | NOT IMPLEMENTED (gated 0) |
| Quote comparison | LIVE as tool — do not homepage-rank |

## S. FLORIDA / NATIONAL SEPARATION

National homepage does **not** import Citizens, CHOICES, IRFS, NFIP certification, SB 832, or “Florida’s largest insurer.” Florida is labeled as the only live **state intelligence** page. Credential-row map shading = **volume in this graph**, not quality.

## T. SOURCE / PROVENANCE READINESS

Trace This Number exists on census metrics. Featured findings have source, as-of, limitation, does-not-mean. **READY** for INS-HOME-002 to keep Trace; do not add untraced metrics.

## U. insurance-home-intel-v1 CONTRACT

Already implemented in `lib/national/home-intel.ts`. Keep version string. Fingerprint excludes `generatedAt`. Browser must not query raw LOA/CMS/credential tables.

Person authority field (conceptual): `status: source-specific`, `nationallyComparable: false`, `publicProfileReady: false`.

Do not add fields for WORKS_FOR or national complaint rates until data exists.

## V. V1 STATE OF THE RECORD

Keep current cards: 82,071 agencies · 1,029,860 persons (research graph only) · 6,185 legal insurers · 1,300,108 CMS observations · 1,531,158 credentials · public directory 170,499 / graph agencies 0 / people 0 / legal insurers 0.

## W. V1 THREE NATIONAL STORIES

Exactly three — already live; **do not replace**.

1. **Insurance is a network, not one company list** — legal insurer vs agency vs person. Confidence high. V1 ready.
2. **Some agencies hold credentials across multiple states** — SQL-locked D2 distribution. Confidence high with five-state limitation. V1 ready.
3. **Lines of authority matter — and they are not one national taxonomy yet** — source-family LOA rows, not a product pie. Confidence high as a **gap**. V1 ready.

Rejected for V1 featured slot: national person LOA pie; complaint grade; safest-state map; WORKS_FOR employment graph.

## X. V1 EVIDENCE COVERAGE

| Family | Status |
|---|---|
| Identity | Partial (graph exists; public profiles gated) |
| State licensing | State-dependent (FL, TX, VT, MA, OH) |
| Agency LOA | Source-specific (TX, MA, VT) |
| Person LOA | Source-specific; not nationally comparable |
| Appointments | State-dependent |
| Agency affiliation / WORKS_FOR | Unavailable (0) |
| Regulatory history | Source-limited / INTERNAL_ONLY |
| Complaints | Source-limited; no rate |
| Marketplace | Partial (federal overlay) |
| Medicare | Partial (tools) |
| Carrier legal identity | Partial (6,185; pages 0) |
| Domicile | Not yet researched |
| Geography | Credential-row volume, not service territory |

## Y. V1 EVIDENCE JOURNEY

| Step | Status |
|---|---|
| Official identifier (NPN/NAIC/license #) | partial (internal; ZIP search is directory) |
| State credential | partial / state-dependent |
| Authority / LOA | partial; source-specific |
| Agency affiliation | unavailable |
| Carrier appointment | partial |
| Marketplace / federal | partial |
| Regulatory observations | partial / not public grade |
| Research profile | connected for directory listings + `/florida`; people 0 |

## Z. WHAT WE DON’T KNOW

State fields vary; appointment ≠ employment; domicile ≠ territory; Marketplace ≠ DOI license ≠ certification; no-match ≠ clean; person LOA ≠ national product mix; missing LOA ≠ no authority; UNKNOWN status stays unknown.

**Verify directly:** official DOI record; legal insurer name on policy; appointment for the product; plan-year Marketplace/Medicare.gov; compare another licensed option.

## AA. EXPLORE THE MARKET

Keep current map: FL/TX/VT/MA/OH credential-row intensity, Florida opens `/florida`, others open directory. Shading = **credential rows in this graph**, not safest state.

## AB. ASK THE MARKET

Keep structured Q&A (carrier vs agency, producer, license, LOA, appointment, complaint, Marketplace). No recommendation chatbot.

## AC. USE THE RESEARCH

Promote only live: directory, `/florida`, methodology, Medicare/Marketplace tools, license verification, My Insurance. No aspirational producer-directory or 6,185-insurer search cards.

## AD. COMPARISON READINESS

| Pair | Status |
|---|---|
| Agency vs agency | PARTIAL (directory listings; not graph 82,071) |
| Producer vs producer | NOT READY (public people 0) |
| Carrier vs carrier | PARTIAL (Medicare carrier rollups; not 6,185 legal-insurer pages) |

No winner/safest/trust score.

## AE. V1 HOMEPAGE COMPONENT MAP

1. Intelligence hero + ZIP (honest grain)  
2. State of the Record  
3. What the Data Says (exactly 3 stories)  
4. Evidence depth  
5. Explore (credential-volume map)  
6. Ask the Market  
7. Use the Research  
8. Sources / limitations / glossary  

Institutional, not a quote funnel.

## AF. MOBILE / ACCESSIBILITY CONTRACT

1440: no overflow (scrollW 1425 / 1440). 390: inherited My Insurance chassis overflow ~69px — **not** this audit’s fix unless INS-HOME-002 touches chassis. One chart at a time; Trace/Explain keyboard `details`; table captions; glossary for NPN, NAIC, LOA, appointment, domicile, producer, carrier, Marketplace, Medicare Advantage. No color-only meaning.

## AG. SEO CONTRACT

Do not change indexing in this task. Keep `index, follow`. Title/H1 already intelligence-oriented. Do not promise a producer search in metadata.

## AH. PERFORMANCE CONTRACT

Server component + frozen aggregate. No client fetch of 1.7M LOAs. Keep `insurance-home-intel-v1` fingerprinting. Proposed later: optional materialized census table — **PROPOSED FOR supporting task, not required for V1** because counts are already compiled into the module.

## AI. TEST BASELINE

| Command | Result |
|---|---|
| `check:ins-nat-012` | PASS |
| `check:ins-home-004` | PASS |
| `check:ins-home-003b` | PASS (SQL lock LOCKED) |
| `check:ins-home-006` | PASS |
| `check:fl-ins-007` | PASS (25) |
| `tsc --noEmit` | PASS |
| Full `npm test` / `npm run lint` / `npm run build` | Not re-run in this audit window; prior intel builds passed; repo-wide eslint has **pre-existing unrelated** failures |

## AJ. BLOCKERS

None for documenting V1. Blockers for **future** features (not this audit): WORKS_FOR=0; no national active-license flag; no person publication; no NAIC homepage search.

## AK. RECOMMENDED INS-HOME-002 SCOPE

**Do not redesign the three stories.** INS-HOME-002 should:

1. Treat `ec955fc` + fingerprint `934a4872…` as the payload baseline.  
2. Polish copy/IA/accessibility/mobile overflow **without** changing locked Story #2 integers or Story #3 taxonomy gap.  
3. Tighten ZIP/search honesty (directory listings ≠ 82,071 graph agencies).  
4. Keep Trace/Explain; keep Florida locked.  
5. Add **no** person LOA pie, **no** complaint grade, **no** ingest.

If 002 is “implementation of Intelligence OS,” that OS is **already live** — 002 is refinement, not a greenfield rebuild.
