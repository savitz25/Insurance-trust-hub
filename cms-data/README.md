# CMS Public Data — InsuranceTrustHub Phase 1

Local foundation for:

- **Plan Complaint Index** (Star Ratings complaint / CAHPS / member-experience measures)
- **Government Verification Panel** (provider enrollment standing, opt-out status)
- **Trust Score — Government Standing** component

**Download date:** 2026-07-27  
**Domains used:** `cms.gov`, `data.cms.gov` only  

> These files are large (~2 GB total). They are intentionally **not** committed to git (see repo `.gitignore`). Re-download from the source URLs below when refreshing.

---

## Folder layout

```
cms-data/
├── star-ratings/           # Unzipped Star Ratings + display measures (ready to use)
├── enrollment/             # MA/Part D monthly enrollment + plan directory
├── provider-enrollment/    # PPEF, Order & Referring, Opt Out
├── raw/                    # Original ZIPs and CSV copies as downloaded
└── README.md               # This file
```

---

## 1. Star Ratings (highest priority)

**Parent page:** https://www.cms.gov/medicare/health-drug-plans/part-c-d-performance-data  

| File | Source URL | Description |
|------|------------|-------------|
| `2026-star-ratings-data-tables.zip` | https://www.cms.gov/files/zip/2026-star-ratings-data-tables.zip | **Primary.** Contract-level Star Ratings tables for 2026, including measure-level data (complaint rates and related Part C/D measures), domain stars, summary ratings, cut points, high/low performers. Unzipped to `star-ratings/2026-star-ratings-data-tables/`. |
| `2025-star-ratings-data-tables.zip` | https://www.cms.gov/files/zip/2025-star-ratings-data-tables.zip | Prior-year tables for YoY complaint / rating comparisons. Unzipped to `star-ratings/2025-star-ratings-data-tables/`. |
| `2026-display-measures.zip` | https://www.cms.gov/files/zip/2026-display-measures.zip | Display (non-Star) measures for 2026. Unzipped to `star-ratings/2026-display-measures/`. |
| `2026-star-ratings-fact-sheet.pdf` | https://www.cms.gov/files/document/2026-star-ratings-fact-sheet.pdf | Public summary of 2026 Star Ratings methodology / highlights. |
| `2026-star-ratings-technical-notes.pdf` | https://www.cms.gov/files/document/2026-star-ratings-technical-notes.pdf | Full technical notes (measure definitions, including complaint measures). |

### Key extracted files (Plan Complaint Index)

Under `star-ratings/2026-star-ratings-data-tables/`:

| File | Use |
|------|-----|
| `2026 Star Ratings Data Table - Measure Data (Oct 8 2025).csv` | Raw measure rates (includes complaints about the health/drug plan and related measures) |
| `2026 Star Ratings Data Table - Measure Stars (Oct 8 2025).csv` | Star assignment per measure |
| `2026 Star Ratings Data Table - Summary Ratings (July 22 2026).xlsx` | Overall / Part C / Part D summary ratings |
| `2026_Report_Card_Master_Table_2026_07_22.xlsx` | Master report card (updated July 2026) |
| `2026 Star Ratings Data Table - Domain Stars (Oct 8 2025).csv` | Domain-level stars |
| `2026 Star Ratings Data Table - Disenrollment Reasons (Oct 8 2025).csv` | Disenrollment reason measures |

Same structure under `2025-star-ratings-data-tables/` for 2025.

---

## 2. Medicare Advantage / Part D Enrollment

**Parent page:** https://www.cms.gov/data-research/statistics-trends-and-reports/medicare-advantagepart-d-contract-and-enrollment-data  

| File | Report period | Source URL | Description |
|------|---------------|------------|-------------|
| `monthly-report-contract-2026-07.zip` | 2026-07 | https://www.cms.gov/files/zip/monthly-report-contract-2026-07-zip.zip | **Monthly Enrollment by Contract** — enrollment counts per MA/Part D contract. Unzipped to `enrollment/monthly-report-contract-2026-07/`. |
| `cpsc-enrollment-2026-07.zip` | 2026-07 | https://www.cms.gov/files/zip/cpsc-enrollment-2026-07-zip.zip | **Monthly Enrollment by Contract/Plan/State/County** — preferred for future county pages. Unzipped to `enrollment/cpsc-enrollment-2026-07/`. |
| `ma-plan-directory-2026-07.zip` | 2026-07 | https://www.cms.gov/files/zip/ma-plan-directory-2026-07-zip.zip | **Optional.** MA / Cost / PACE / Demo plan public contact directory. Unzipped to `enrollment/ma-plan-directory-2026-07/`. |

Detail pages used to resolve ZIP URLs:

- Contract: https://www.cms.gov/data-research/statistics-trends-and-reports/medicare-advantagepart-d-contract-and-enrollment-data/monthly-enrollment-contract/enrollment-contract-2026-07  
- CPSC: https://www.cms.gov/data-research/statistics-trends-and-reports/medicare-advantagepart-d-contract-and-enrollment-data/monthly-enrollment-contract/plan/state/county/monthly-enrollment-cpsc-2026-07  
- MA Plan Directory: https://www.cms.gov/data-research/statistics-trends-and-reports/medicare-advantagepart-d-contract-and-enrollment-data/ma-plan-directory  

---

## 3. Medicare Provider Enrollment (Government Verification / Trust Score)

**Dataset page:** https://data.cms.gov/provider-characteristics/medicare-provider-supplier-enrollment/medicare-fee-for-service-public-provider-enrollment  

**Catalog used to resolve exact file paths:** https://data.cms.gov/data.json  

| File | Vintage | Source URL | Description |
|------|---------|------------|-------------|
| `PPEF_Enrollment_Extract_2026.07.17.csv` | 2026-07-01 release | https://data.cms.gov/sites/default/files/2026-07/9c89bdde-66b6-4fb9-8c2f-a96cbb3859ba/PPEF_Enrollment_Extract_2026.07.17.csv | **Primary.** Medicare FFS Public Provider Enrollment (PPEF) base extract — actively approved providers eligible to bill Medicare. |
| `PPEF_Enrollment_Extract_2026.04.01.csv` | 2026-01-02 / Q1 snapshot | https://data.cms.gov/sites/default/files/2026-05/9b0dd033-8c63-4e52-b9b0-0cabdb5db198/PPEF_Enrollment_Extract_2026.04.01.csv | Prior PPEF base extract (paired with Q1 sub-files below). |
| `PPEF_Additional_NPIs_2026.04.01.csv` | Q1 2026 | https://data.cms.gov/sites/default/files/2026-04/PPEF_Additional_NPIs_2026.04.01.csv | Additional NPIs sub-file |
| `PPEF_Practice_Location_Extract_2026.04.01.csv` | Q1 2026 | https://data.cms.gov/sites/default/files/2026-04/PPEF_Practice_Location_Extract_2026.04.01.csv | Practice address / location sub-file |
| `PPEF_Reassignment_Extract_2026.04.01.csv` | Q1 2026 | https://data.cms.gov/sites/default/files/2026-04/PPEF_Reassignment_Extract_2026.04.01.csv | Reassignment relationships sub-file |
| `PPEF_Secondary_Specialty_Extract_2026.04.01.csv` | Q1 2026 | https://data.cms.gov/sites/default/files/2026-04/PPEF_Secondary_Specialty_Extract_2026.04.01.csv | Secondary specialty sub-file |

### Related optional datasets

| File | Source URL | Description |
|------|------------|-------------|
| `OptOut_June2026.csv` | https://data.cms.gov/sites/default/files/2026-07/f08a4239-361c-46be-89e3-fa0205fbe8c1/OptOut_June2026.csv | Providers who opted out of Medicare (Opt Out Affidavits). Dataset page: https://data.cms.gov/provider-characteristics/medicare-provider-supplier-enrollment/opt-out-affidavits |
| `OrderReferring_20260723.csv` | https://data.cms.gov/sites/default/files/2026-07/95201c74-7f9d-4f02-b567-b34ab4d97afe/OrderReferring_20260723.csv | Order and Referring eligibility (FFS). Dataset page: https://data.cms.gov/provider-characteristics/medicare-provider-supplier-enrollment/order-and-referring |

---

## Gaps / notes

1. **PPEF sub-files** (address, reassignment, additional NPIs, secondary specialty) available on `data.cms.gov` at download time were still **Q1 2026 (2026.04.01)** while the base enrollment extract had a **July 2026** refresh. Prefer the July base extract for standing checks; join sub-files carefully if PECOS IDs / NPI keys differ across vintages.
2. **Star Ratings complaint measures** live inside the Measure Data / Measure Stars CSVs and are documented in the Technical Notes PDF — not a separate “complaint index” file from CMS.
3. **Enrollment months** after July 2026: re-check the Monthly Enrollment by Contract / CPSC listing pages and replace the `2026-07` ZIPs when newer months publish (typically by the 15th of each month).
4. **Not downloaded:** full historical Order & Referring archive (weekly files only; latest kept), older Opt Out months, Star Ratings years before 2025.

---

## Suggested next steps (app integration)

1. Parse `2026 Star Ratings Data Table - Measure Data` for complaint-related measure IDs → **Plan Complaint Index**.
2. Index `PPEF_Enrollment_Extract_2026.07.17.csv` by NPI → Government Verification “actively enrolled” flag.
3. Cross-check NPI against `OptOut_June2026.csv` → Trust Score Government Standing penalty / flag.
4. Join contract IDs to `monthly-report-contract-2026-07` enrollment for size / market context.

---

## License / use

CMS public use files. Follow CMS terms of use for redistribution and attribution. Do not treat enrollment standing as a sole determinant of agent legitimacy — combine with state DOI licensing and other Trust Score inputs.
