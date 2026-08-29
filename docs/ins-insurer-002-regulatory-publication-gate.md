# INS-INSURER-002 — Legal-insurer regulatory evidence publication gate

Conditional profile pilot. **Wave 1 = 0.** Homepage and Florida closed.

## A. STATUS

**COMPLETE WITH BLOCKERS**

The only legal-insurer-attached family is Texas TDI **complaint-index statistics**. That family is public data, exactly NAIC-attached, and useful internally — but it is not a safe first consumer evidence family under this task’s gates (not an enforcement action; reads as a complaint score; existing COMPLAINT renderer is fail-closed). Identity-only pages are **NO**. Pilot = **0**.

## B. RELEASE

Starting `origin/main`: `89f6e04b3d30dd140cd0dcaf5e38cb5c8e8320a3`. Production `/` and `/florida` 200. Decision `ZERO_PUBLICATION`. `db_writes` all 0. No `PUBLIC_REGULATORY_EVIDENCE_ENABLED` flip.

## C–F. SOURCE INVENTORY AND DENOMINATORS

Live Production (keyset, 2026-08-29):

| | |
|---|---:|
| R1 total legal insurers | 6,185 |
| R2 with ≥1 attached observation | 1,259 |
| R3 with zero attached | 4,926 |
| R4 attached observations | 5,713 |
| R5 public-safe | **0** |
| R6 internal-only | 5,713 |
| R7 review-required | 0 |
| R8 unique insurers with public-safe | **0** |

R2+R3=R1. R5+R6+R7=R4. Total evidence 5,978 = 5,713 attached + 265 unattached.

### `tdi_complaint_indexes` (pa9u-9s9w)

| Field | Value |
|---|---|
| Regulator | Texas Department of Insurance |
| Dataset | `tdi_complaint_indexes` |
| Observation type | `CONFIRMED_COMPLAINT_INDEX` |
| Family | `COMPLAINT` |
| Grain | legal insurer × year × line of coverage (statistic, not an order) |
| Identifier | TDI NAIC ID |
| Attachment | exact CoCode on official spine |
| Total rows | 5,966 |
| Attached | 5,713 |
| Unique legal insurers | 1,259 |
| Dates | 2019-12-31 … 2025-12-31 |
| Retrieved | 2026-08-27T00:00:00.000Z |
| Public URL | yes (data.texas.gov) |
| Publication eligible | **no** |

Hold reason: source-native object is confirmed complaints, policy counts, and a **complaint index** by year and line. It is not a consent order, examination, or enforcement action. `mayPublishRegulatoryEvidenceRecord` already rejects `COMPLAINT` for the generic enforcement renderer. Publishing it under Regulatory & Enforcement History would read as a complaint score and as violations.

### `florida_dfs_receiver_companies`

12 rows, **0** attached to legal insurers. Held (Florida firewall + not on allowlist + unattached).

## G. DUPLICATE-EVENT AUDIT

Grouping key: `source_dataset|record_identifier` (TDI `org|year|line|naic`). Attached rows 5,713 = distinct keys 5,713. Extra = 0. Multiple year×line slices per insurer are **different source slices**, not the same action repeated. No fuzzy name/text merge.

## H. PUBLICATION ELIGIBILITY V2

| State | Count |
|---|---:|
| PUBLIC_READY | **0** |
| REVIEW_REQUIRED | 0 |
| INSUFFICIENT_EVIDENCE | 4,926 |
| IDENTITY_COLLISION | 0 |
| INTERNAL_ONLY | 1,259 |

Allowlist is empty. Global flag remains false. Source-family allowlist + entity gate — not an unrestricted switch.

## I. IDENTITY-ONLY PAGE DECISION

**NO.** Name + NAIC without a public-safe evidence family is a thin shell. Do not publish 6,185 identity pages.

## J. PROFILE CONTRACT

`insurance-legal-insurer-profile-v1` extended with `regulatoryEvidence[]`, `whatThisDoesNotMean`, `enforcementScore: null`, `complaintScore: null`. Public arrays stay empty this task. Trace This Record retained.

## K. PILOT DECISION

**WAVE 1 = 0.** No risk-based cohort. Neutral selection is unused because PUBLIC_READY = 0.

## L–N. ROUTES / SITEMAP / SEARCH

No `/insurers`. Sitemap delta 0. Internal NAIC/name ranking unchanged and not exposed publicly. `/carriers` brand hub unchanged.

## O. REGULATORY COPY (held, not rendered)

Heading if ever public: **Regulatory & Enforcement History**, submodule **Complaint Data**.

Absence: no attached observation in currently ingested sources is not a clean record.

A record count is ingested source rows in listed families and date ranges — not a count of violations.

Complaint-index statistics do not establish a regulatory violation or enforcement finding.

## P–S. FIREWALLS

Semantic safety PASS. Homepage `934a4872…`. Florida `8021301d…`. Public people 0. Public graph agencies 0.

## T. NEXT TASK

**INS-INSURER-003 — ingest at least one non-COMPLAINT legal-insurer evidence family** (for example a public examination/order dataset with exact NAIC and source-native action labels) **or** a dedicated, non-scoring TDI Complaint Data surface that cannot be mistaken for enforcement history.

Do not start here.
