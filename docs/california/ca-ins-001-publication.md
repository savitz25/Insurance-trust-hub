# CA-INS-001 — California insurance state publication

Public route: `/california`  
Snapshot: `insurance-ca-state-intel-v1`

## Regulators

Keep **CDI** and **DMHC** separate. DMHC Knox-Keene evidence is not the CDI admitted universe.

## Acquired

| Source | Result |
|--------|--------|
| DMHC enforcement datastore | **5,435** rows, 2000-07-03 through 2026-05-22 |
| DMHC IMR datastore aggregates | **42,749** determinations |
| CDI dated health-insurer HTML list | **28** companies as of 2025-12-31 (28 phones, 27 websites) |
| CDI FAIR Plan fact sheet PDF | 2023 statewide new-and-renewed counts |

Direct CHHS CSV URLs returned S3 signature errors. Official CKAN datastore is the acquired source.

## Not acquired

Complete CDI admitted roster: **SOURCE_NOT_ACQUIRED** (lookup is OPEN_SEARCH_ONLY).  
Producer mailing lists: **SOURCE_AVAILABLE_BY_PAID_LIST / SEARCH_ONLY** — not purchased, not scraped.  
Rate filings: OPEN_SEARCH_ONLY. No SERFF reconstruction.

Huge IMR raw CSV / Findings text is not committed.
