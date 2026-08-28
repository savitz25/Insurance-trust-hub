# FL-INS-004 — source audit

Observed 2026-08-28 from official DFS/OIR HTML. SHA-256 values are in `data/reports/fl-ins-004-source-inventory.json`.

## 1. Civil Remedy Notice (DFS)

| | |
|--|--|
| Home | https://apps.fldfs.com/civilremedy/ |
| Search | https://apps.fldfs.com/civilremedy/SearchFiling.aspx |
| Method | Live GET of ASP.NET pages |
| Bulk | **None.** No CSV, Excel, or API. Search is interactive (file #, dates, insurer **name**, type, reasons, statutes). |
| Identity columns | No NAIC. No Florida Company Code. |
| Adjudication | DFS “does not involve itself.” |
| Class | `PUBLIC_RECORDS_REQUEST` |
| Ingested | 0 |

## 2. OIR market-conduct listings

| | |
|--|--|
| P&C | https://floir.gov/property-casualty/property-and-casualty-market-regulation |
| L&H | https://floir.gov/life-health/life-and-health-market-regulation |
| Method | Live GET; parse published PDF links |
| Identity columns | Title + URL only |
| Notes | Tables mix **exam reports** and **consent orders**. Older `/Sections/MarketInvestigations/default.aspx` is 404. |
| Ingested | 0 (censused, unattached) |

## 3. OIR financial examinations

| | |
|--|--|
| P&C | https://floir.gov/property-casualty/property-casualty-financial-oversight |
| L&H | Candidate `life-and-health-financial-oversight` (recorded if live) |
| Method | Live GET; parse published PDF links |
| Identity columns | Title + URL only |
| Ingested | 0 (censused, unattached) |

## 4. OIR orders / memoranda

| | |
|--|--|
| Hub | https://floir.gov/resources-and-reports/orders-and-memoranda (also linked as floir.com) |
| Plus | Consent-order PDFs on the market-regulation listings |
| Method | Live GET; classify title (`Consent Order`, `Final Order`, pending) |
| Identity columns | Title + URL only |
| Ingested | 0 (censused, unattached) |

## 5. DFS receivership (ingested)

| | |
|--|--|
| List | https://www.myfloridacfo.com/division/receiver/companies |
| Details | `/division/receiver/companies/detail/{id}` |
| Method | Live GET of list + each open-company detail page |
| Open set | 12 companies in **liquidation**; rehabilitation heading empty |
| Identity columns | Name, court case when present. **No NAIC / Florida Company Code** |
| Ingest | Unattached `LIQUIDATION` INTERNAL_ONLY rows, `record_identifier = receivership:{id}` |

## 6. Not used

- DFS licensee bulk CSVs (appointments / licenses) — no CRN/exam/order/receivership events
- OIR Active Company Search XML — company master, not enforcement events
- NAIC company status 0/4/6 — status, not an event
- TDI complaint indexes — already ingested nationally; not Florida-sourced
- Citizens / CHOICES / IRFS / FSLSO / NFIP — FL-INS-005
