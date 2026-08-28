# FL-INS-005 — denominator dictionary

Do not conflate these.

| Term | Definition | Clock |
|------|------------|-------|
| OIR active companies | Companies in the official Active Company Search XML (FL-INS-002), 3,972 company records | oir_company |
| MIR reporting companies | Residential writers that filed a Market Intelligence Report for the stated month/quarter. Trade-secret companies are **omitted** from public Excel/wizard. Data **not audited** before publication. | mir |
| PIF | Policies in force as reported in that MIR period and line. Always date-scoped. | mir / citizens |
| Written premium | Direct written (or source-labeled) premium for the period. Not earned unless the column says earned. Not a consumer price. | mir / fslso |
| Market share | Source-computed share of the MIR public (non-trade-secret) denominator for that line/period. Not popularity or quality. | mir |
| CHOICES sample | Illustrative average premium for a **pre-defined** OIR example profile and Florida county, from approved filings feeding the tool. Not a quote. | choices |
| IRFS filings | One File Log Number = one filing. Documents inside a filing are not extra filings. Status is the official Final Action, not inferred. Search cap 2,500. | irfs |
| Citizens policies | Citizens in-force count on an **official dated** extract. Policies *serviced* after takeout are a different denominator. | citizens |
| Takeout offers | Private-company selection/authorization to **offer** Citizens policies. Not a completed assumption. | citizens |
| Takeout assumptions | Policies actually assumed on an official assumption date. | citizens |
| FSLSO policies / premium | Surplus-lines transactions reported to FSLSO for the snapshot period. Not admitted written premium. | fslso |
| FSLSO / OIR eligible insurers | OIR surplus-lines (and federally authorized / aviation-wet marine) eligibility. Not admitted status. | fslso + oir_company |
| NFIP registry entities | Agencies on the FEMA/NFIP Agency Registry / public agencies list. Listing ≠ FIRA training ≠ certification. | nfip |

CMS Marketplace registration remains a separate denominator from OIR authorization.
