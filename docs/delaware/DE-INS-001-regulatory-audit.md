# Delaware insurance population audit (DE-INS-001)

Checked: 2026-10-12. State DOI sources were audited before acquisition. Each regulator dataset remains at its own grain and clock.

## Existing coverage and acquisition

- No Delaware insurance route or source workbook existed in the isolated worktree at audit time.
- The Delaware DOI Active Companies workbook was available as an official Excel attachment, marked `Active Company 10.01.2026`. It has 2,279 source rows across 26 company types and 2,274 distinct SBS company IDs, with five IDs repeated across source rows. Raw and derived attachments are under `data/delaware-ins-001/`.
- The DOI/NAIC SBS live verification service and report generator were reviewed. The report-generator host returned HTTP 403 to automated acquisition; this does not indicate an empty roster.

## Separate classes

| Source class | Official source | Acquisition disposition |
| --- | --- | --- |
| Admitted/approved/authorized insurers and company-type rows | [DOI active-company workbook page](https://insurance.delaware.gov/divisions/berg/authorizedcompanies/) | 2,279 source rows, 26 company types, 2,274 SBS IDs. Property Casualty 937; Life And Health 444; other source classes retained in class summary. |
| Producer persons and agency/business entities | [DOI licensee lookup](https://insurance.delaware.gov/services/licenseelookup/) | Live SBS verification; current dated statewide rows NOT_ACQUIRED. Person and business-entity records remain separate. |
| Adjusters, appraisers, and surplus-lines brokers | [DOI producer licensing services](https://insurance.delaware.gov/divisions/renewlicense/) | Separate license populations are supported by the department's services. Current dated rows NOT_ACQUIRED. |
| Insurer appointments | [DOI producer licensing services](https://insurance.delaware.gov/divisions/renewlicense/) | DOI links company appointment listings in SBS. Relationship rows not downloaded; NOT_ACQUIRED. |
| Examination, orders, and enforcement | [DOI Enforcement Actions & Fines](https://insurance.delaware.gov/information/actions/) | Separate company regulatory-action source. No current rows acquired or name-only joined. |
| Complaints | [DOI Consumer Services](https://insurance.delaware.gov/divisions/consumerhp/) | Complaint process is not a violation finding; dated extract NOT_ACQUIRED. |

## Reconciliation rules

The 2,279 company workbook rows are source observations, not a single insurer census. `SBS COMPANY NUMBER` repeats five times, so rows were preserved and the repeated identifiers reported. No agency, producer, adjuster, surplus-lines broker, appointment, examination, or complaint counts are inferred from insurer rows. A missing extract is NOT_ACQUIRED, not zero.
