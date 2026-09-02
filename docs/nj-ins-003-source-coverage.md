# NJ-INS-003 source coverage (public New Jersey page)

Public route: `/new-jersey` (`index,follow`). Existing `/hubs/new-jersey/...` agency hubs stay separate.

Numbers on the page come from committed NJ-INS-001 / 001C / 002 artifacts. Missing evidence blocks that metric, not the page.

| Family | Official source | Public treatment |
| --- | --- | --- |
| Admitted carriers | https://www.nj.gov/dobi/data/inscomp.htm | 1,370 legal entities, all exact NAIC, class `ADMITTED_INSURER` |
| Surplus-lines eligible | https://www.nj.gov/dobi/data/sl_whitelist260720.pdf | `SOURCE_NOT_ACQUIRED` as a census. Not combined with admitted. Missing ≠ zero. |
| DOI enforcement | `/dobi/division_insurance/insfines{YY}.htm` | Events / orders / documents / hashes kept separate. 2008 = `SOURCE_NOT_ACQUIRED` |
| BFD enforcement | `/dobi/division_insurance/bfd/enforcement.htm` | 2,241 events, all `CONSENT_ORDER` from page headings |
| Market-conduct exams | `/dobi/division_consumers/insurance/marketconductexams.htm` | 93 reports; name-only / multi-entity withheld from profiles; not enforcement |
| Financial exams | `/dobi/division_insurance/finexam_reports.htm` | 129 reports; 117 exact NAIC; not a solvency rating |
| Auto consumer report | `/dobi/division_consumers/insurance/auto.htm` | 2023–2024 only; group grain stays group; complaint ≠ violation |
| Rehab / liquidation | `/dobi/division_insurance/finesolv.htm` | Official status only; no inferred insolvency |
| IHC / SEH | `/dobi/division_insurance/ihcseh/` | Programs kept separate; brand grain; average rate change ≠ consumer premium |
| Get Covered NJ | IHC asterisk, not marketing homepage | Participation ≠ endorsement |
| Residual markets | `/dobi/division_insurance/propcas.htm` | NJIUA, PAIP, SAIP, CAIP kept separate |
| CRIB Plan Risk | https://www.njcrib.com/FileDownload/PlanRiskDAT | Coverage statement only. See `nj-ins-003-crib-publication-review.md` |
| SERFF NJ | https://filingaccess.serff.com/sfa/home/NJ | `SOURCE_ACCESS_BLOCKED` (HTTP 403). Blocked ≠ zero filings |

## Not page blockers

Database not executed, unresolved identity links, SERFF blocked, incomplete complaint history, incomplete authorization subtypes, CRIB restricted, partial examination identity mapping.

## Page blockers (none present in this snapshot)

Fabricated metrics, source-use violation, misleading denominator, unsupported adverse profile attribution, group/entity grain corruption, examination/enforcement conflation, complaint/violation conflation, broken route/build, source contradiction.

## QA

- `npm run assert:nj-ins-001`, `assert:nj-ins-002`, `assert:nj-ins-003` pass.
- Typecheck passes.
- Production build includes static `/new-jersey` and existing `/hubs/new-jersey/...` hubs.
- Built sitemap includes `https://www.insurancetrusthub.com/new-jersey` and does not add county routes under `/new-jersey/`.
- Pre-existing `npm run lint`: 15 errors / 54 warnings in unrelated files. Not rewritten in this ticket.
