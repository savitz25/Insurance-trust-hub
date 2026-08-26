# INS-NAT-005 — Graph schema activation + Ohio license-class recovery

No national graph backfill. No public URL/filter/count changes.

Registry version: **1.1.0**

---

## A. STATUS

**COMPLETE WITH BLOCKERS**

Ohio official class is recovered for **5,299 / 5,306** staging NPNs (**CONFIRMED** mailing-list join). Seven remain `UNRESOLVED` (absent from the current official reports; not named-inferred).

The additive graph SQL is **still not live**. A human SQL Editor package is in `docs/INS-NAT-005-GRAPH-SQL-EDITOR.md`.

InsuranceTrustHub is **classification-ready** for a controlled confirmed-core backfill and **not persistence-ready** until that SQL runs.

---

## B. BASELINE

| Item | Value |
|------|--------|
| Branch base (INS-NAT-003) | `22ba03918c457d23401d8768d4e381af670413ae` |
| `origin/main` | `fe1a83841b65d087c7803b76cbcd8dbb284a1dbc` (INS-NAT-003 not yet on main) |
| Migration | `supabase/migrations/20260826120000_national_identity_graph.sql` |
| SHA-256 | `d918e1161fe77a9f582453285dc2372d463f41a4ca5caa15d1b07e411ec1f4c8` |
| Registry before | 1.0.0 |
| Registry after | **1.1.0** (Ohio mailing-list types; empty Ohio still unknown) |
| Providers | 170,499 unchanged |

---

## C. GRAPH SCHEMA

All ten graph tables return PostgREST **404**. DDL is not available in this environment.

Human action: paste the existing additive migration in the Supabase SQL Editor. See `docs/INS-NAT-005-GRAPH-SQL-EDITOR.md`.

Expected provider impact: **NONE**. Expected post-apply graph row counts: **0**. Do not backfill in this task.

---

## D. OHIO SOURCE INVESTIGATION

Original import (2026-08-13):

- File: `C:\Users\makei\insurance-trust-hub\data\ohio-raw\agencies.csv` (not on this machine)
- Batch `956d5854-ae15-41eb-a85a-c52a0bf0bf24`, `launch-markets-only`, 7,401 source rows → 7,201 raw → 5,306 producers
- Raw JSON keys (all rows sampled): `org_name`, `address_line1/2/3`, `city`, `state_province_name`, `postal_code`, `originalIssueDate`, `EXPIRATIONDATE`, `NATIONALPROVIDERNUMBER`
- **No license number column. No license type column. No LOA column.**
- `odi_producers.license_number` equals NPN

The adapter (`lib/odi/normalize.ts`) already maps `License Type` / `Line of Authority` when those headers exist. They were **not present**. Class was not dropped by a mapping bug.

ODI’s official mailing-list CSV **never emits license type as a column**. Type is a **report filter** (`licenseTypeIds=`). Selecting all types into one file produces exactly the schema we ingested.

Finding: **B/C** — class is available from official per-type mailing-list exports, joined on NPN. Not from the mixed CSV. Not from company name.

---

## E. OFFICIAL OHIO TAXONOMY (mailing-list Licensing Type)

Source: ODI Agent/Agency Mailing Lists (`ProcessAllCompanyFilter` → `BusinessEntityMailingList.csv`), plus ODI business-entity pages and ORC 3905.06 / OAC 3901-5-09.

| Official ODI type | Namespace | Role | Product class | Core? | Confidence |
|-------------------|-----------|------|---------------|-------|------------|
| Major Lines | producer | core_producer_agency | core_agency | yes | CONFIRMED |
| Limited Lines | limited_lines | ancillary_distributor | ancillary_distribution | no | CONFIRMED |
| Limited Lines Portable Electronics | limited_lines | ancillary_distributor | ancillary_distribution | no | CONFIRMED |
| Limited Lines Self-Service Storage | limited_lines | ancillary_distributor | ancillary_distribution | no | CONFIRMED |
| Managing General Agent | producer | specialty_producer | specialty_insurance | no | CONFIRMED |
| Surplus Lines | surplus_lines | specialty_producer | specialty_insurance | no | CONFIRMED |
| Title | title | title_agency | title | no | CONFIRMED |
| Title Insurance Marketing Rep | title | title_agency | title | no | CONFIRMED |
| Surety Bail Bond | bail_bond | bail_agency | bail | no | CONFIRMED |
| Public Insurance Adjuster | adjuster | claims_adjuster | claims_service | no | CONFIRMED |
| Public Insurance Adjuster Agent | adjuster | claims_adjuster | claims_service | no | CONFIRMED |
| Third Party Administrator | tpa | tpa | tpa | no | CONFIRMED |
| Reinsurance Intermediary Broker | other | specialty_producer | specialty_insurance | no | CONFIRMED |
| Reinsurance Intermediary Manager | other | specialty_producer | specialty_insurance | no | CONFIRMED |
| Viatical Settlement Broker | other | specialty_producer | specialty_insurance | no | CONFIRMED |
| Navigator | other | unknown | out_of_scope | no | CONFIRMED |
| Temporary | other | unknown | unknown | no | REVIEW_REQUIRED |
| *(empty / unmatched)* | other | unknown | unknown | no | UNRESOLVED |

Raw ODI strings are preserved. FL/TX class is **not** copied onto Ohio credentials.

---

## F. ROW-LEVEL RECOVERY

Method: official Business Entity mailing lists, one Licensing Type × Resident/Non-Resident/Certified, join `NATIONALPROVIDERNUMBER` → `odi_producers.npn`.

51 reports, 26,170 statewide NPNs.

| | Count |
|--|------:|
| Staging Ohio records | 5,306 |
| CONFIRMED NPN join | **5,299** |
| UNRESOLVED (no current mailing-list hit) | **7** |
| Major Lines (core-eligible Ohio credential) | 4,273 |
| Title only | 448 |
| Limited Lines / self-storage / PE (ancillary primary) | 465 |
| Surety Bail Bond only | 67 |
| Public Insurance Adjuster | 18 |
| TPA only | 27 |
| Mixed types on one NPN | 176 |

Unresolved (not name-classified): BENEFITS ADVISORS OF OHIO INC, METROPOLITAN TITLE AGENCY INC, MID AMERICA LAND TITLE AGENCY, INC., NATIONAL TITLE COMPANY, PCTITLE PROS INC, PILAT INSURANCE AGENCY INC, THE AL WASHINGTON INSURANCE AGENCY LTD. Likely lapsed between the 2026-08-13 extract and the 2026-08-26 mailing lists.

---

## G. RERUN NATIONAL SIMULATION (registry 1.1.0 + Ohio overlay)

| Metric | INS-NAT-003 | INS-NAT-005 |
|--------|------------:|------------:|
| Confirmed identities | 107,084 | 107,084 |
| Provisional identities | 30,667 | 30,667 |
| Unknown entities | 4,251 | **8** |
| Core-agency entities (incl. provisional cores) | 106,703 | 109,978 |
| **Proposed confirmed-NPN core entities** | **78,668** | **81,943** |
| Proposed credentials | 106,885 | 110,167 |
| Proposed multi-state | 18,839 | 18,845 |
| Ohio unknown credentials | 5,306 | **7** |
| Ohio core identities | 0 | **4,273** |
| Fingerprint SHA-256 | `2fc38aeb…e894` | `26e5a041284260df4c10cc9350882698ac258c005dad2720e957594368efc08c` |

Backfill **not executed**.

Ohio was never “5,306 agencies.” About 80% of the launch-market extract is Major Lines; the rest is title, limited lines, bail, TPA, and public adjusters.

---

## H. READY FOR CONTROLLED BACKFILL?

**Classification: yes** (confirmed-NPN core cohort is defensible *for the current extracts*).

**Persistence: no** until graph SQL is applied.

Do not treat 81,943 as the US insurance-agency market. NV/MS remain provisional. Current-vs-historical still not computable from the extract.

---

## I. IMPLEMENTATION

- `lib/national/classification/*` registry **1.1.0**
- `lib/odi/normalize.ts` maps `NATIONALPROVIDERNUMBER`
- `scripts/check-ins-nat-005.ts`
- `scripts/national/ohio-class-join.ts`
- `scripts/national/classify-dry-run.ts` Ohio overlay
- `docs/INS-NAT-005-GRAPH-SQL-EDITOR.md`

Tests: INS-NAT-003 C1–C13 PASS; INS-NAT-005 OH1–OH9 PASS.

### Status / freshness capability (no current-agency headline)

| Source | Status column | Expiration | Issue | Extract meaning | Capability |
|--------|---------------|------------|-------|-----------------|------------|
| FL | Yes — DFS `valid` 98,614 / `valid - probation` 8. No expiration on `dfs_producers`. | No | No | All Valid Licenses Business | **CURRENT_AT_OBSERVATION_ONLY** |
| TX | Inferred active/expired from expiration (not an official TDI status token). 47,454 / 1,279. | 100% | 100% | Open-data agencies; some expired remain staged | **CURRENT_CAPABLE** (date-based only) |
| OH | Adapter defaulted `active` for every row — **not** regulator status (CSV had no Status). | 100% (mailing list) | 100% | Current mailing-list snapshot | **CURRENT_AT_OBSERVATION_ONLY** |
| NV | 19,751 active / 128 expired; expiration 100% | 100% | 100% | Firms-by-type export | **STATUS_INCOMPLETE** (and identity provisional) |
| VT | DFR license status 1,983 active / 1 expired | 100% | 100% | Quarterly licensee list | **CURRENT_CAPABLE** |
| MS | 10,613 active / 30 expired; issue 0% | 100% | 0% | Producer entity list | **STATUS_INCOMPLETE** (and identity provisional) |

Do not treat import recency, `verified`, or `license_checked_at` as regulator-active. No national current-agency headline.

---

## J. RECOMMENDED NEXT TASK

**Apply the SQL Editor package, then CONFIRMED CORE-AGENCY GRAPH BACKFILL** of the 81,943-NPN cohort.

Do not backfill until `national_entities` exists. Do not include the 7 unresolved Ohio rows or NV/MS provisionals.
