# INS-INSURER-001 — National legal insurer identity, search, and public-profile readiness

Publication-readiness audit. Homepage and Florida closed. `db_writes = 0`.

## A. STATUS

**COMPLETE WITH BLOCKERS**

The 6,185-row NAIC legal-insurer spine is internally coherent. It is **not** ready as a consumer public profile surface. Wave 1 publication = **0**.

## B. RELEASE

| Field | Value |
|---|---|
| Starting `origin/main` | `0ecdc2fc6a31e0221bd179613d5ddfa3d405dca9` |
| Production | https://www.insurancetrusthub.com — `/` 200, `/florida` 200, git-main alias of `0ecdc2f` |
| Branch / worktree | `ins-insurer-001-legal-insurer-readiness` / `C:\Users\makei\insurance-trust-hub-insurer-001` |
| Decision | `ZERO_PUBLICATION` |
| Rollback | `0ecdc2f` (no Production insurer-graph change) |

## C. LEGAL INSURER CENSUS (6,185)

| Population | Count | Grain | Source | Public meaning |
|---|---:|---|---|---|
| Legal insurers | **6,185** | `entity_kind=legal_insurer` | NAIC Listing of Companies Jun 2026 (`naic_loc_jun_2026`) | One five-digit **NAIC company code** = one legal insurer. Not a brand. Not an appointer. |
| Insurance groups | 720 | `entity_kind=insurance_group` | Same LOC file | NAIC group ≠ NAIC company. |
| Consumer brands | 14 | `entity_kind=consumer_brand` | Curated registry, `internalOnly` | Not legal insurers. `USES_BRAND` = 0. |

Provisional key: `legal-insurer:naic:{CoCode}`. Identifier scheme: `naic_cocode`. Live count matches homepage grain.

## D. CARRIER-KIND RECONCILIATION (13,547 vs 6,185)

Live `entity_kind=carrier` = **13,547** = **12,030** `carrier:fl-dfs:%` + **1,517** `carrier:tx-tdi-naic:%`.

These are **appointing entities reported by a state regulator**, not legal insurers.

| Extra carrier-kind rows | What they are |
|---|---|
| Brands? | No. Not consumer-brand rows. |
| Duplicate legal identities? | No. Different kind and key namespace. |
| Historical? | Some TX/FL appointments may be historical; the **entity** is still an appointer. |
| Lacking NAIC? | FL DFS appointing numbers are **not** NAIC CoCodes. Digit coincidence is `REVIEW_REQUIRED`, never a merge. |
| CMS/Marketplace-only? | No. These keys are state appointment identifiers. |
| Appointer-only? | **Yes.** That is the grain. |

Do **not** add 6,185 + 13,547. Do not substitute `carrier` for `legal_insurer`.

## E. NAIC COVERAGE

| Measure | Count |
|---|---:|
| Legal insurers | 6,185 |
| With valid NAIC CoCode | **6,185** |
| Missing NAIC | **0** |
| Duplicate NAIC codes (one code → many entities) | **0** |
| One entity → multiple NAIC identifiers | **0** |
| Identifier rows `scheme=naic_cocode` | 6,185 |
| Source | Official LOC CoCode; never invented from name |
| Clock | `2026-08-27T00:00:00.000Z` |

## F. NAME / BRAND AUDIT

| Measure | Count |
|---|---:|
| Exact duplicate legal names | **29** groups (same name, **different CoCodes**) |
| Normalized duplicate legal names | **29** (same set) |
| `USES_BRAND` bridges | **0** |
| Curated `/carriers/[slug]` brand pages | 14 (Medicare/Marketplace hub, **not** this graph) |

29 same-name/different-CoCode pairs are **not** identity collisions. Search may return both; identity stays CoCode-keyed.

Brand search V1: **legal name + NAIC only**. No manufactured `BRAND → LEGAL_INSURER` edges.

## G. PUBLICATION ELIGIBILITY

| State | Count |
|---|---:|
| PUBLIC_READY | **0** |
| REVIEW_REQUIRED | 0 |
| INSUFFICIENT_EVIDENCE | **6,185** |
| IDENTITY_COLLISION | 0 |
| INTERNAL_ONLY | 0 (product rows held via insufficient *public* evidence) |

Why not PUBLIC_READY: a public profile needs useful **public** evidence. Credentials on legal-insurer grain = **0**. Regulatory evidence is attached but `PUBLIC_REGULATORY_EVIDENCE_ENABLED = false`. Marketplace sample of 200 attached rows = **person**, not legal insurer. Empty identity shells are forbidden.

`REVIEW_REQUIRED` cannot publish. Product `mayPublishEntityKind('legal_insurer')` remains **false**.

## H. PROFILE EVIDENCE DEPTH

| Family | Status |
|---|---|
| Identity (legal name + NAIC) | Available internally for all 6,185 |
| Domicile | Not a homepage/national field on this grain |
| State credentials / LOA | **0** rows on `entity_kind=legal_insurer` |
| Marketplace | Not deterministically attached to legal insurers |
| Medicare/CMS | Curated `/carriers` brand rollups only; regex is not a legal-insurer join |
| Regulatory observations | 5,713 attached internally; **not public** |
| Source clocks | Identity clock from LOC Jun 2026 |

Contract `insurance-legal-insurer-profile-v1` exists as an internal shape. No score. No recommendation.

## I. REGULATORY ATTACHMENT

| | Count |
|---|---:|
| Total observations | 5,978 |
| Insurer-attached (`respondent_kind=legal_insurer`) | 5,713 |
| Agency / person / carrier-kind attached | 0 / 0 / 0 |
| Unattached | 265 |
| Method | Exact NAIC / source-native identifier |
| Name-only join | **Prohibited** |

Public display remains off.

## J. MARKETPLACE / CMS ATTACHMENT

| | Count |
|---|---:|
| Observations | 1,300,108 |
| Attached to some `entity_id` | 731,990 |
| Unattached | 568,118 |
| Sample of 200 attached entities | **200 person / 0 legal_insurer** |

Do not place Marketplace evidence on an insurer page from brand-name similarity.

## K. APPOINTMENT FIREWALL

| | Count |
|---|---:|
| `APPOINTER_RESOLVES_TO` | 1,510 (TX CONFIRMED only) |
| FL DFS appointers | 12,030 — number is **never** a CoCode |
| TX unresolved IDs | 7 (held) |
| `appointed_by` | 2,680 |
| `USES_BRAND` | 0 |

No trustworthy FL bridge → appointments stay **off** legal-insurer profiles.

## L. SEARCH READINESS

Internal ranking is implemented and tested:

1. exact NAIC  
2. exact legal name  
3. normalized legal name  
4. deterministic alias  
5. text similarity  
6. stable tie-break (NAIC, then name, then id)

Never complaint volume, market share, premium, rating, popularity, or paid status.

**No public `/insurers` route this task.** Existing `/carriers` is a different product.

## M. PROFILE CONTRACT

`insurance-legal-insurer-profile-v1` — identity + clocks + empty evidence arrays + `score: null`. Trace This Record. Not mounted on a URL.

## N. PUBLICATION DECISION

**Wave 1 = 0.** Architecture supports a later bounded NAIC identity directory **only after** a public evidence family is authorized (regulatory display and/or a CONFIRMED brand/CMS bridge). This prompt’s uncertainty rule: publish nothing.

## O. SITEMAP

Before: no `/insurers/*`. After: no `/insurers/*`. Expansion = 0 = published wave.

## P. SEMANTIC SAFETY

LEGAL INSURER ≠ brand ≠ NAIC group ≠ appointer ≠ CMS entity ≠ Marketplace observation ≠ agency ≠ producer ≠ directory listing.

## Q. HOMEPAGE / FLORIDA / PRODUCER / AGENCY

Homepage fingerprint `934a4872…` unchanged. Florida `8021301d…` unchanged. Public people 0. Public graph agencies 0.

## R. NEXT RECOMMENDED TASK

**INS-INSURER-002 — public regulatory-evidence display for CONFIRMED NAIC-attached insurer observations (5,713), or an explicit product decision that identity-only NAIC pages are in scope.** Do not start here.
