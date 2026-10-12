# Delaware insurance evidence packet (DE-INS-001)

Source checked and retrieved: 2026-10-12. The official workbook sheet is titled `Active Company 10.01.2026`.

## Company population

- Raw active-company rows: 2,279 across 26 official `COMPANY TYPE` classes; all workbook rows have `COMPANY STATUS = Active`.
- Distinct SBS company identifiers: 2,274. Five identifiers occur in multiple rows; those source observations are not deduplicated. See `derived/repeated-sbs-company-numbers.csv`.
- Per-type counts: `derived/company-type-observations.csv`.
- The active-company source includes insurer categories plus reinsurance, TPA, PBM, rating organization, premium finance, and other classes. It is not a combined insurer-only denominator.
- Selected source-native classes: Property Casualty 937; Life And Health 444; Domestic Surplus Lines Company 38; Risk Retention Group 117; Captive Insurer 3.

| Attachment | Authority URL | Clock | SHA-256 |
| --- | --- | --- | --- |
| `raw/de-active-companies-2026-10.xlsx` | [DOI Active Companies](https://insurance.delaware.gov/divisions/berg/authorizedcompanies/) | Sheet `Active Company 10.01.2026`; source says monthly updates | `EA22B282EB7C6CEFFCC76B596B61F7740D10E877AC97BD5BA95ED4EFECEEF03F` |
| `derived/company-type-observations.csv` | Derived from the first 15 source columns using workbook `COMPANY TYPE` | Same workbook clock | Class-level source-row counts; not entity totals |
| `derived/repeated-sbs-company-numbers.csv` | Derived from `SBS COMPANY NUMBER` | Same workbook clock | Five IDs occur on multiple rows; all retained |

## Other regulatory populations

- DOI says NAIC/SBS lookup supports producer verification and its licensing page links an SBS report generator for downloaded licensee lists. The external generator returned HTTP 403 in this acquisition pass. Current dated producer/agency, adjuster, surplus-lines broker, and appointment rows: NOT_ACQUIRED.
- DOI enforcement-actions page is distinct from license status and complaint intake. No dated action/complaint rows were acquired or joined to licensee identities.
- No insurer, business entity, person, branch, appointment, examination, or enforcement rows were combined.
