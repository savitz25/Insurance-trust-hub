# CT-INS-001 — Connecticut insurance statewide evidence

Acquired 2026-09-28 UTC from Connecticut Insurance Department (CID) public sources. This is a dated source snapshot, not a live SBS export or a Connecticut-wide count of insurance businesses.

| Source family | Exact source grain | Frozen coverage |
| --- | --- | --- |
| [CID company list](https://portal.ct.gov/cid/-/media/cid/1_lists/licencom.pdf) | Company-type row, as of 2026-06-30 | 1,773 rows; 1,633 rows print five-digit NAIC; 1,611 distinct NAIC codes; no per-row expiration/current-status field |
| [CID market-conduct index](https://portal.ct.gov/cid/department-resources/cid-reports/market-conduct-examination-report) | Examination/disposition index row, closed 2022-01-01–2026-09-28 | 184 rows: 144 “Fined,” 40 “Review Completed”; not unique companies or a complete licensee-action roster |
| Linked 2026 market-conduct PDFs | PDF-confirmed stipulation and consent order | 8 rows; docket retained where printed/readable; no exact NAIC/NPN printed in extracted text |
| [CID financial-exam index](https://portal.ct.gov/cid/department-resources/cid-reports/financial-examination-report) | Report row by examination as-of date | 54 rows, 2022–2024; no NAIC printed in index |

Company-list class examples (not additive into one insurer count): 857 Property Casualty, 385 Life plus Accident and Health, 261 Excess and Surplus Lines, 45 Accredited, 18 Certified Reinsurer. All 16 printed company types remain in `company-roster.json`. One NAIC may occur in more than one class.

Read-only NAIC cross-check against the existing 6,185-identity legal-insurer index: 1,611 roster rows share an exact NAIC with 1,593 distinct existing legal-insurer identities; 22 NAIC-bearing roster rows are unmatched. This is a keyset intersection, **not** a graph attachment or an assertion of current licensure. The company-list status and expiration columns are unavailable. Agency/person NPN counts and matches are NOT_ACQUIRED.

CID uses [SBS for license lookup and reports](https://portal.ct.gov/cid/licensing). [CID says licensee enforcement documents are accessible through SBS](https://portal.ct.gov/cid/knowledge-base/articles/background-and-disciplinary-information); the public report-generator endpoint was inaccessible here, so agency, producer, adjuster, appointment and licensee-action bulk rosters are NOT_ACQUIRED. Appointment is a relationship, not a license. CID [complaint intake](https://portal.ct.gov/cid/file-a-complaint) is KNOWN; provider-level complaint cases and outcomes are NOT_ACQUIRED. A complaint is not a finding. No name-only enforcement joins are permitted.

Clocks stay separate: company PDF as-of 2026-06-30; all snapshots retrieved 2026-09-28T18:56:10Z; market-conduct rows retain exam closed dates (not assumed order-signing dates); financial rows retain examination as-of dates; `/connecticut` emits its own generation time.

Graph writes: 0. New canonical organizations: 0. Exact enforcement attachments: 0. Name-only adverse joins: 0. Claim eligibility changes: 0. No local/county pages. Source PDFs and indexes can change; the frozen JSON includes source URLs and SHA-256 hashes, and `scripts/connecticut/build_snapshot.py` regenerates the snapshot from public CID endpoints.
