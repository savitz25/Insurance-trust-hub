# MI-INS-001 — Michigan DIFS evidence

Starting `origin/main`: `c150a4c4e89a0932af9fc5d41461d78a50496c78`.

## Licensing and verification

DIFS provides distinct real-time locators for legal insurance entities, licensed agency businesses, individual agents/producers, and producer appointments. DIFS says locator information can be used as proof of licensure. The public locator endpoints did not yield a clean bulk export during this blitz. Insurer, agency, producer, appointment, surplus-lines, TPA, risk-retention, purchasing-group and premium-finance rosters: **NOT_ACQUIRED**. No company status, authority, type or lines were inferred without a current regulator record. DIFS says an agency business acting as a producer must hold its own license.

## Final Decisions

`scripts/acquire-mi-ins-001.py` reads the public DIFS SXA search JSON. At retrieval the mixed-industry Final Decisions index reported 904 total entries; 517 parse into the requested 2022-01-01 through 2026-09-28 window, and 321 explicitly mention insurance, insurer, producer, insurtech or reinsurance in their indexed title or action. Year counts: 2022 35, 2023 78, 2024 38, 2025 72, 2026 98. This filter is deliberately conservative and does not claim a complete insurance enforcement census. A final decision index row is a document, not a unique matter or an adverse finding against every named party.

All 321 selected public PDFs were checked. 293 print a Michigan System ID in the caption; 318 have a parsed decision-issued date. NPN, NAIC and separate license number were not confidently present in those captions. Each index row retains respondent as indexed, reported action, case number, index date, PDF URL, printed identifier where found and source page. The public index and PDF may have different clocks. PDF text helps distinguish 249 business-entity producer respondents; remaining grain labels are conservative. A stipulated action remains labeled as such.

No DIFS decision was joined to a canonical organization or person. Exact enforcement attachments 0; name-only attachments 0.

## Market and financial exams

The official DIFS Company Examinations table has 41 rows with insurer name, exact NAIC code text, exam type, report date, disposition and PDF link. Latest listed report date is 2021-12-16; there are **0 listed reports dated 2022–2026**. Forty report rows have at least one exact NAIC overlap with 37 existing legal-insurer identities in the hub's read-only national identity index. Those are held crosswalk matches, not current Michigan authorization and not graph evidence attachments. The DIFS Reports page has selected financial-exam material; no current company-wide financial-exam index was acquired.

## Complaints and graph

Complaint intake is **KNOWN**. DIFS publishes company complaint statistics and ratios, but provider-level complaint case records and outcomes were **NOT_ACQUIRED**. No complaint was treated as a finding. Net-new canonical organizations 0; graph writes 0; claim eligibility changes 0. No local or city routes.

## Official sources

- [DIFS locator FAQ](https://www.michigan.gov/difs/difs-locator-faq)
- [Regulated insurance entities and locator links](https://www.michigan.gov/difs/industry/insurance/regulated-insurance-entities)
- [Producer/agency licensing](https://www.michigan.gov/difs/industry/licensing-ins/agncy-ins)
- [Final Decisions](https://www.michigan.gov/difs/legal/hearings-decisions/final-decisions)
- [Company market examinations](https://www.michigan.gov/difs/industry/insurance-mkt-regulation/company-examinations)
- [Complaint statistics](https://www.michigan.gov/difs/complaint-statistics)
- [DIFS reports](https://www.michigan.gov/difs/news-and-outreach/reports)
