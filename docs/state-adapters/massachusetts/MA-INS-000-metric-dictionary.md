# MA-INS-000 — Massachusetts metric dictionary (not released)

Denominators use **audited grain**, never raw row count as “entities.”

Candidate metrics for a later Massachusetts State Intelligence task. **Do not publish rankings or hub copy from this prompt.**

| Metric | Dry-run value | Grain |
|--------|--------------:|-------|
| Source rows | 9,151 | file |
| Distinct NPN entities in source | 9,148 | NPN |
| Distinct MA licenses | 9,148 unique NPN+class; 9,149 LICENSE_NO | credential |
| Active licenses (source status) | 9,148 unique / 9,151 rows | credential |
| Inactive/expired in file | 0 | this extract is active-only |
| Distinct LOA labels | 9 | LOA vocabulary |
| License–LOA relationships | 25,918 | HAS_LOA |
| Entities with ≥1 active MA credential | 9,148 NPN | entity |
| MA-domiciled | 2,044 licenses | domicile |
| Nonresident / non-MA domicile | 7,103 | domicile |
| Existing national agencies gaining MA credential | 7,059 | exact NPN |
| Existing persons gaining MA credential | 0 | exact NPN |
| Net-new NPN candidates | 2,089 | not ingested |
| Contact observations predicted | 27,444 | phone+email+address |
| Entities with a contact observation | see contact report | NPN |
| Source freshness | file mtime 2026-08-27; as-of UNRESOLVED | provenance |
| Graph MA credentials today | 0 | pre-ingest |
| Wave-1 `ma_producers` | 0 | unrelated pipeline |

## What this source can defensibly add

- Massachusetts **Insurance Producer** license verification for entities already in the national graph (7,059 agencies).
- Source-reported **Active** status, first-active and expiration dates.
- Official **LOA** vocabulary (Life, Accident & Health or Sickness, Property, Casualty, Personal Lines, Variable Life & Variable Annuity, Travel, Credit, Property & Casualty).
- **Nonresident** MA authority with separate domicile (FL/NY/CA/TX/NJ and others).
- Official **business contacts** (phone, email, address reported to MA DOI).
- A Massachusetts State Intelligence **denominator** once CONFIRMED rows are ingested.

## What it cannot support

- “All Massachusetts agencies”
- Individual producer census / person pages
- Inactive/expired/revoked populations
- Adjusters, title, surplus-only, or licensed insurance companies
- Employment / WORKS_FOR
- Marketplace or Medicare inference from Health/Life LOA
- Treating domicile or business address as a Massachusetts service location
