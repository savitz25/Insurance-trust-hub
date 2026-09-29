# MD-INS-001 Maryland MIA evidence

Starting main: `5b7ffabdf7327a1223650690fe43afbc1a0c3148`.

## Sources and acquisition

- [MIA Company and Producer instructions](https://insurance.maryland.gov/consumer/pages/companysearchinstructions.aspx) state that search data is updated weekly and that company, other-entity, firm and person searches are distinct. The public Company search `InsCompanySearch.aspx/GetRecords` accepted one unfiltered Company-class request and returned 1,295 rows, below its displayed 3,000-row cap. `scripts/build-md-ins-001.py` freezes name, five-digit NAIC, printed status and MIA source ID. Contact and street fields are omitted. Separate Other Licensed Entity endpoint returned 114 rows and is not added to the Company count.
- Exact NAIC bridge intersects only five-digit MIA codes with the existing `data/reports/ins-insurer-006-identity-index.json`. It is read-only; no name matching, new insurer identities or profile attachments.
- [MIA Orders and Exams Search](https://www.apps.insurance.maryland.gov/CompanyProducerInfo/OrderSelectType.aspx) serves separate company and producer-firm grids. `scripts/build-md-ins-orders.py` queries each year 2022–2026 by signed-date range and traverses the public result pages. It preserves respondent grain, document name, signed date, category, division, displayed status and MIA source IDs. Company years 2022, 2023 and 2025 each returned exactly 150 rows (10 pages) and are marked saturated; the index is a bounded captured set, not a full census. The grid provides document postbacks rather than stable direct PDF URLs. Source page links are published.
- [Producer Enforcement Summaries](https://insurance.maryland.gov/Pages/available-public-information/ProducerEnforcementSummaries.aspx) have one public PDF per year 2022–2026. `scripts/build-md-ins-001.py` extracts six printed columns from table rows with an action date. A PDF row can combine firm and person names; ambiguous rows retain `unresolved producer/agency` grain. No name-only attachment is made.
- [MIA complaint intake](https://insurance.maryland.gov/consumer/pages/fileacomplaint.aspx) and suspected-fraud reporting are KNOWN. Provider-level complaint outcomes and civil fraud orders are NOT_ACQUIRED.

## Gaps and clocks

Agency and individual-producer verification are KNOWN, but their bulk rosters are NOT_ACQUIRED. Company business types, domicile, lines of business, application dates, per-company source-status dates, and individual exam PDF findings are NOT_ACQUIRED. The weekly MIA search update schedule is not an exact update timestamp. Retrieval times, index signed dates, producer action dates, and page generation are separate clocks.

Exact agency/license matches 0; exact enforcement attachments 0; name-only adverse joins 0; new canonical organizations 0; graph writes 0; claim eligibility changes 0.

Rebuild dependencies: Python `requests`, `pdfplumber`, and `beautifulsoup4`.
