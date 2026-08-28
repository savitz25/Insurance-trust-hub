# FL-INS-001B — Agency appointment count reconciliation

Status: **COMPLETE — FLORIDA AGENCY APPOINTMENT COUNT RECONCILED**

Live census `2026-08-28T16:11:59Z`. **No inserts. No updates. No deletes.** OIR not started. Appointer→NAIC not started. Publication unchanged.

## A. STATUS

COMPLETE — FLORIDA AGENCY APPOINTMENT COUNT RECONCILED

## B–D. Live census

| Denominator | Count | How identified |
| --- | ---: | --- |
| All `appointed_by` | **2,680** | `national_relationships.relationship_type = appointed_by` (full keyset page) |
| Florida `appointed_by` | **2,680** | `source_dataset = florida_dfs_appointments` **and** target `carrier:fl-dfs:{n}` |
| Non-Florida `appointed_by` | **0** | no other source, jurisdiction, or namespace |

Not inferred from names. Every live row is `agency → carrier:fl-dfs:*`, `identity confidence = CONFIRMED`, match method = exact NPN, jurisdiction = FL.

| Slice | Counts |
| --- | --- |
| source_dataset | `florida_dfs_appointments` 2680 |
| raw.task | INS-NAT-007 **989** (2026-08-26); FL-INS-001 **1691** (2026-08-28) |
| from_kind / to_kind | agency 2680 / carrier 2680 |
| to namespace | fl-dfs 2680 |
| source_record_id grain | UUID `dfs_appointments.id` 997; `fl-dfs-biz:{license}\|{number}\|{type}` 1683 |

## What 5,243 was

Transient overlap while two FL-INS-001 writers ran against the same DFS Business file:

| Layer | Count | When | Grain |
| --- | ---: | --- | --- |
| INS-NAT-007 | 989 | 2026-08-26 | `source_record_id` = `dfs_appointments.id` UUID |
| `run-fl-ins-001.ts` | 2,563 | 2026-08-28 15:47Z | `license\|appointer\|tycl\|issue` |
| Parallel `fl-ins-001.py` | 1,691 | 2026-08-28 | UUID when staging matched, else `fl-dfs-biz:{license}\|{number}\|{type}` |

**989 + 2,563 + 1,691 = 5,243.**

The Python execute then recorded `relationships_deleted_conflicting_grain: 2563` and kept `relationships_inserted: 1691`. The 2,563 composite-grain rows are **not live**. They were the same official DFS observations under a competing `source_record_id`, not a second appointment.

## E. What 989 was

The **entire national `appointed_by` table** after INS-NAT-007 (2026-08-26).

Query semantics (INS-NAT-007):

```
dfs_appointments (30,486 ACTIVE)
  → producer_id → dfs_producers
  → source_record_links → national_entities (verified-core agencies)
  → appointed_by → carrier:fl-dfs:{Appointing Entity Number}
```

989 attached. 29,497 staging appointments belonged to producers outside the confirmed-core agency graph (mostly warranty / limited-line) and were **not** used to mint agencies.

It was **not**:

- a Florida-only subset of a larger national table (the table *was* 989 and 100% Florida)
- a provider-backed cohort
- an old report undercount of the current CONFIRMED DFS set

Of those 989: **987** still match the 2026-08-28 All Active Business file; **2** are retained historical (see stale extras).

## F. FL-INS-001 inserts

Corrected surviving value: **1,691** CONFIRMED.

The TypeScript runner inserted 2,563 under `license|appointer|tycl|issue`, then the Python runner deleted those 2,563 as conflicting grain and inserted 1,691 under the contract grain. A later TypeScript `--execute` inserted 0 because the surviving 1,691 plus the 989 already covered the CONFIRMED set at that grain.

## G. Unexplained difference

Starting figure: **1,691** (= 5,243 − 3,552).

That 1,691 is fully explained: it is the parallel FL-INS-001 CONFIRMED insert set. It is not another jurisdiction, not a legal-insurer attach, and not a duplicate of the 989.

3,552 was the wrong expectation: it assumed the 2,563 composite-grain rows would remain **and** ignored the parallel 1,691-row writer. After grain cleanup:

**989 + 1,691 = 2,680.**

## H. Difference classification (live rows)

| Class | Count | Meaning |
| --- | ---: | --- |
| LEGITIMATE_PREEXISTING | **987** | INS-NAT-007 rows still in the current All Active file |
| LEGITIMATE_OTHER_SOURCE | **0** | |
| LEGITIMATE_OTHER_JURISDICTION | **0** | |
| FL_CONFIRMED_BUT_OMITTED_FROM_PRIOR_BASELINE | **1,691** | FL-INS-001 exact-NPN CONFIRMED rows the 989 verified-core join never attached |
| DUPLICATE | **0** | no 5-tuple duplicates; no official-observation duplicates |
| STALE_EXTRA | **2** | INS-NAT-007 rows absent from the 2026-08-28 file; **retained** |
| WRONG_TARGET | **0** | no legal-insurer / non-FL / non-agency targets |
| UNKNOWN | **0** | |

987 + 1,691 + 2 = **2,680**.

## I. Deterministic Florida set

Recomputed from `AllActiveAppointmentsBusiness.csv` (Last-Modified 2026-08-28, 59,405 rows).

Rules: exact canonical agency NPN; official FL DFS appointing entity number; CONFIRMED only; no person inheritance; no name matching. Grain: `license_number + appointing_entity_number + appointment_type (TYCL Desc)`. Administrative repeats collapsed (26 keys, 3,576 extra rows).

| Metric | Count |
| --- | ---: |
| Source rows | 59,405 |
| Unique official grains | 55,829 |
| Skip missing/invalid NPN | 25 |
| Skip no canonical agency for NPN | 53,126 |
| Skip REVIEW_REQUIRED NPN collision | 0 |
| **EXPECTED** (CONFIRMED) | **2,678** |
| **PRODUCTION_CORRECT** | **2,678** |
| **MISSING** | **0** |
| **STALE_EXTRA** | **2** (retained) |
| **WRONG_TARGET** | **0** |
| **DUPLICATE** | **0** |

All 2,678 expected observations matched production on `agency + appointing number + license + appointment type`.

UNRESOLVED NPNs were **not** written as weak agencies. That is why 55,829 unique source grains do not become 55,829 graph edges.

## J. Final production count + grain

**2,680** `appointed_by` rows.

Graph uniqueness remains `(from_entity_id, to_entity_id, relationship_type, source_dataset, source_record_id)`.

Official observation grain remains `license + appointing entity number + appointment type`. **Not** one canonical edge per agency+appointer pair.

81 agency+appointer pairs have multiple rows (distinct appointment class / license / source record). **Do not collapse.**

UUID vs `fl-dfs-biz:` `source_record_id` is writer provenance, not a second appointment. After conflicting-grain cleanup there is one live row per official CONFIRMED observation, plus the two retained historical UUID rows.

## K. Data changes (this task)

inserted **0** · updated **0** · deleted **0**

The two stale extras were **not** deleted. The 1,691 were **not** deleted. The 2,563 conflicting-grain deletes happened in FL-INS-001, not in 001B.

## L. Semantic safety

**PASS**

- CONFIRMED exact NPN only
- Target is `carrier:fl-dfs:{n}`, never a legal insurer
- Florida `APPOINTER_RESOLVES_TO` remains 0
- Appointment type is not an LOA
- No person→agency inheritance
- No name / fuzzy match
- No county appointment ingest
- No OIR / NAIC crosswalk

## M. Publication regression

**PASS**

| Surface | Expected | Live |
| --- | ---: | ---: |
| providers | 170,499 | 170,499 |
| agencies | 82,071 | 82,071 |
| persons | 1,029,860 | 1,029,860 |
| provider→graph bridges | 37,515 | 37,515 |
| public graph agencies | 0 | 0 |
| public persons | 0 | 0 |
| public legal insurers | 0 | 0 |
| sitemap | unchanged | unchanged (`/florida` not added) |
| robots | unchanged | unchanged |

`PUBLIC_PERSON_PROFILES_ENABLED = false`. Legal insurers remain `INTERNAL_ONLY`.

## N. Next task

**FL-INS-002 — OIR COMPANY MASTER / NAIC CONFIRMED CROSSWALK**

Not started.

## Stale extras retained (conclusive IDs)

Absence from the current All Active file is not a proven termination.

| relationship id | license | type | status | source_record_id | task |
| --- | --- | --- | --- | --- | --- |
| `31c6fbf8-3b84-4eb6-9baa-c750fc77c473` | L122529 | REINSURANCE INTERMEDIARY BROKER | HISTORICAL | `d4c23301-7129-4c93-a1a7-9bfa5928810a` | INS-NAT-007 |
| `ea5441f1-97a6-4137-a2bd-74e0ae37e656` | L129553 | REINSURANCE INTERMEDIARY BROKER | CURRENT | `0bca1467-e529-406f-803e-1d0a4d61cdda` | INS-NAT-007 |

## Decision

**KEEP 2,680.** 3,552 was an incorrect expectation. All live rows are legitimate Florida DFS agency appointments (2,678 current CONFIRMED + 2 retained historical). Zero-data-loss audit: nothing deleted to force a prior total.

## Artifacts

- `data/reports/fl-ins-001b-appointed-by-census.json`
- `data/reports/fl-ins-001b-difference-classification.json`
- `data/reports/fl-ins-001b-deterministic-set.json`
- `data/reports/fl-ins-001b-grain.json`
- `data/reports/fl-ins-001b-publication-regression.json`
- `data/reports/fl-ins-001b-verdict.json`
- `scripts/national/run-fl-ins-001b.ts`
- `scripts/check-fl-ins-001b.ts`
