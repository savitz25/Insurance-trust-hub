# FL-INS-000 — Florida insurance forensic baseline

Inventory only. **No mass publication. No UI. No county pages. No Trust Scores.**  
National architecture is reused, not forked.

Live census: `data/reports/fl-ins-000-live-census.json` (2026-08-28T15:02:46Z)

## National baseline (unchanged)

| Object | Count |
|--------|------:|
| Agencies | 82,071 |
| Persons | 1,029,860 |
| Legal insurers | 6,185 |
| Insurance groups | 720 |
| Consumer brands | 14 INTERNAL_ONLY |
| Appointing entities | 13,461 (FL 11,944 · TX 1,517) |
| License credentials | 1,531,158 |
| LOAs | 1,791,158 |
| ASSOCIATED_WITH | 52,827 |
| Agency `appointed_by` | 989 |
| APPOINTER_RESOLVES_TO | 1,510 TX · **0 FL** |
| CMS | 1,300,108 |
| Contacts | 144,864 |
| Regulatory evidence | 5,966 (0 Florida rows) |
| Provider→graph bridges | 37,515 |
| Public providers | 170,499 |
| Public graph agencies / people / insurers | 0 |

## Florida graph credentials (jurisdiction = FL)

| Grain | Count |
|-------|------:|
| FL credential rows | **750,316** |
| Person credentials | **691,127** |
| Agency credentials | **59,189** |
| Namespace producer | 749,457 |
| Adjuster | 112 |
| Warranty | 259 |
| Limited lines | 463 |
| Title | 7 |
| Bail bond | 2 |
| Other | 16 |
| Surplus lines namespace | **0** (surplus agents currently classified producer until class parse) |
| TPA | 0 |

Credential rows ≠ unique persons/agencies. Denominators stay at credential grain unless a later distinct-entity census is run.

## DFS staging

| Table | Count |
|-------|------:|
| `dfs_producers` | 98,622 (all `business`; 0 individual) |
| `dfs_appointments` | 30,486 |
| `dfs_provider_promotions` | 98,622 |

Individuals were national-graph ingested (INS-NAT-010/013), not this staging table.

## Appointing entities

| | |
|--|--|
| FL DFS appointing entities | 11,944 |
| CONFIRMED APPOINTER_RESOLVES_TO | **0** |
| REVIEW_REQUIRED digit coincidences | 17 |
| UNRESOLVED | 11,927 |

DFS Appointing Entity Number ≠ NAIC CoCode ≠ Florida Company Code.

## Locked semantics

ONE ENTITY, MANY CREDENTIALS · LICENSE ≠ LOA · LOA ≠ APPOINTMENT · APPOINTMENT ≠ EMPLOYMENT · CMS ≠ LICENSE · CITIZENS AUTHORIZATION ≠ GENERAL FL LICENSURE · COMPLAINT ≠ ENFORCEMENT · CRN ≠ FINDING · MARKET-CONDUCT ≠ FINANCIAL EXAM · BRAND ≠ LEGAL INSURER · MISSING ≠ ZERO.

## Schema

**No additive migration in this task.** National graph already stores FL credentials, appointments, appointers, legal insurers (NAIC), contacts, CMS, and evidence taxonomy. OIR company code / Citizens / CRN / NFIP / exams attach later as identifier schemes or evidence families without forking tables.

## Next sequence (do not start here)

1. **FL-INS-001** — DFS producer/agency/appointment refresh + class/LOA/public-adjuster/surplus separation  
2. **FL-INS-002** — OIR company master (NAIC + Florida Company Code) CONFIRMED identifier ingest  
3. **FL-INS-003** — Appointing-entity → OIR/NAIC official-bridge attempt (CONFIRMED only)  
4. **FL-INS-004** — Regulatory families (DFS actions, OIR orders, CRN dedicated family, exams, receivership)  
5. **FL-INS-005** — Citizens / CHOICES / IRFS / FSLSO / NFIP registry acquisition  
6. **FL-INS-006** — Controlled public-profile enrichment of existing CONFIRMED-bridged providers only
