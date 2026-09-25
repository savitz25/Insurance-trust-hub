# TN-INS-001 state sprint — Tennessee TDCI licensed companies and regulatory indexes

Gate: `npm run assert:tn-ins-001` (runs `scripts/tennessee/build_snapshot.py --check` first).

## Sources (TDCI Insurance Division, retrieved 2026-09-25)

| Source | Grain | Source clock | Records |
|---|---|---|---|
| List of Licensed Insurance Companies (page data endpoint) | company row, NAIC-keyed | "As of August 31, 2026." | 2,116 served rows (1 blank); 2,029 distinct NAIC; 72 rows print placeholder NAIC 99999 |
| Insurance Activities Monthly Update | event row | as of August 31, 2026; page last updated September 9, 2026 | 83 events (admissions 31, mergers 4, name changes 13, redomestications 21, surrenders/revocations 9, suspensions none, miscellaneous 5) |
| Insurance Company Actions Archive | index line (caption + dated documents) | no list date | 234 lines, 235 documents, dated 2003–2026 |
| Company Examinations Archive | examination listing | exam as-of year 2005–2024; posting dates | 293 listings, 587 Exam/Order PDFs (not parsed) |
| Agent/Producer Disciplinary Actions Archive | person entry | no date field | 1,148 linked entries (counted only) |
| File an Insurance Complaint, Verify an Insurance License, Types of Insurance Companies, Reinsurers & Jurisdictions | capability statements | — | — |

Raw captures live in `data/tennessee/tn-ins-001/raw/` (gitignored); their SHA-256 values are in `sources.json`.
`scripts/tennessee/extract_tdci.py` writes the committed extracts from them; CI only runs the snapshot build.

## Rules

- NAIC is the only company identity key. 2,022 of 2,029 codes match `data/reports/ins-insurer-006-identity-index.json`
  exactly (read-only); 7 stay Tennessee research identities (5 risk retention groups, 2 life companies).
  NAIC 99999 is a placeholder for alien reinsurers (and one captive) and is never treated as an identity; the
  reinsurer page's 7-digit alien codes are not joined by name.
- 14 NAIC codes are listed twice (accredited reinsurer + eligible surplus lines): one identity, two list relationships.
- COMPANY_TYPE and STATUS_REASON stay as published (Licensed, Eligible, Registered, RJ (passported), Accredited,
  Trusteed, Certified (passported), Suspended, Restricted). STATUS_DATE is an Excel serial day; ISO dates are derived.
  Domicile is not Tennessee authority; the mailing-office state is not the domicile.
- Monthly update rows are events, not companies, and are never a second company census.
- Company actions, examinations and producer discipline print no NAIC; nothing is attached to an insurer, agency or
  person. Name-only attachment is unsupported.
- Privacy (MA-INS-001P precedent): street address, city, ZIP and phone columns are not committed; action captions
  that name a counterparty (often a policyholder, sometimes an individual) are withheld; action document links are
  replaced by a reference; producer disciplinary names and links are never written.
- Producer and agency verification is the NAIC public lookup TDCI links to (search-only). No free bulk roster was
  found and none was bought. The graph holds no Tennessee credential source. Complaint intake is known; TDCI
  publishes no Tennessee company-level complaint table (its "Complaint Data" link is NAIC CIS).
- The pre-existing `/hubs/tennessee` market hubs (48 curated research records in code) are not TDCI data and are
  unchanged.

Rebuild: `python -X utf8 scripts/tennessee/extract_tdci.py` (needs raw captures), then
`python -X utf8 scripts/tennessee/build_snapshot.py`.
