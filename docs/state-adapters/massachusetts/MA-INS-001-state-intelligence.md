# MA-INS-001 state sprint — Massachusetts DOI company lists and administrative actions

This state sprint reuses the ticket id of the earlier MA-INS-001 agency-credential ingest
(`MA-INS-001-ingest.md`, `npm run check:ma-ins-001`). This sprint's gate is `npm run assert:ma-ins-001`.

The MA-INS-000 rule "no `/massachusetts` launch" applied to the producer-license extract. It still
holds for that extract. `/massachusetts` is published from different official sources that never read it.

## Sources (committed under `data/massachusetts/ma-ins-001/`)

| Source | Grain | Source date | Records |
|---|---|---|---|
| DOI Licensed or Approved Companies XLSX | company row, NAIC-keyed | printed September 1, 2026 | 2,716 rows; 1,693 distinct NAIC; 1,000 rows without NAIC |
| Auto Liability 6G / Workers' Comp 6E / Health 6B / Eligible Surplus Lines / Domestic Life / Domestic P&C / Fidelity & Surety 4 XLSX | designation membership by NAIC | printed September 1, 2026 | 587 / 486 / 566 / 212 / 16 / 49 / 514 (never summed) |
| DOI Administrative Actions page (2015–2026 tables) | action row | no list date; per-row effective dates | 319 rows |
| DOI Enforcement page | term definitions and the pre-2015 public-record rule | — | 6 definitions |
| Public Hearing Decisions page | decision listing (index only) | per-listing issue dates | 325 listings |
| Market Conduct Examination Reports page | report listing (index only) | posted under year examined | 107 listings |

Retrieval: 2026-09-24 with headless Chromium (Mass.gov returns 403 to direct HTTP clients).

## Rules

- NAIC is the only company identity key. 1,665 of 1,693 codes match `data/reports/ins-insurer-006-identity-index.json`
  exactly (read-only); 28 stay Massachusetts research identities. No graph writes, no new profiles, no name merges.
- A NAIC listed under two Company Types (23 cases) is one identity with two list relationships.
- Designation lists are relationships on the same identity and are never added together.
- The State column is a mailing address, not domicile. Surplus-lines eligibility is not admitted status.
- Administrative actions print no NAIC and are never attached by name. A primary allegation is not a finding;
  disposition labels are kept as listed. Licensee names are not republished.
- Agency and producer bulk rosters are paid (SBS Report Generator) or public-record-request only: not acquired.
  The 7,187 existing MA agency credentials are partial coverage, not a census.

Rebuild: `python -X utf8 scripts/massachusetts/build_snapshot.py` (stdlib only; `--check` in CI).
