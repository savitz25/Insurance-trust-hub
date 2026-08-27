# INS-NAT-FINAL-003 — Florida official crosswalk source audit

National identity only. Not Florida State Intelligence. Not `FL-INS-000+`.

## Question

Does any official record contain:

Florida DFS **Appointing Entity Number** + **NAIC company code**

or a zero-ambiguity official chain:

Appointing Entity Number → Florida company identifier → NAIC CoCode?

## Existing project sources

| Source | Fields | Bridge? |
|--------|--------|---------|
| DFS All Active Appointments Individual CSVs (INS-NAT-013) | License Number, NPN, **Appointing Entity Number**, Appointing Entity Name, appointment type/status/dates, contacts | **No NAIC. No Florida Company Code.** |
| DFS All Active Appointments Business CSV | Same appointing-entity pair | **No NAIC.** |
| `dfs_appointments` staging | `appointing_entity_number`, `appointing_entity_name`, `carrier_name` | **No NAIC column.** |
| Official DFS glossary (INS-NAT-007) | Appointing Entity Number, Florida Company Code, and NAIC Company Code listed as **distinct** | Forbids treating DFS number as NAIC |
| NAIC LOC-JUN-2026 | COMPANY CODE / GROUP CODE | National legal-insurer spine only |
| Curated `/carriers` registry | Brand regex | Not official; not used |

## Official Florida sources inspected for this task (identity mapping only)

| Source | What it contains | Why it is not a CONFIRMED DFS→NAIC bridge |
|--------|------------------|-------------------------------------------|
| [DFS Licensee Search bulk downloads](https://licenseesearch.fldfs.com/BulkDownload) | Producer licenses and appointments | Appointing Entity Number + name. No CoCode. |
| [OIR Active Company Search](https://companysearch.floir.gov/) | Interactive search by name, **Florida Company Code or NAIC Company Code** (not both in one lookup field) | Florida Company Code ≠ DFS Appointing Entity Number. No bulk appointing-number crosswalk in-repo. |
| Sunbiz corporate files | Division of Corporations entities | Not insurance company NAIC identity. |

No OIR company-master bulk file with both DFS Appointing Entity Number and NAIC was present in the repository or staging tables.

## Result

- CONFIRMED Florida bridges this task: **0**
- REVIEW_REQUIRED: the 17 DFS numbers that coincide with real CoCodes (digit coincidence ≠ identity)
- UNRESOLVED: remaining Florida appointers (explicit, durable census in `data/reports/ins-nat-final-003-crosswalk.json`)

A later official same-record export may raise CONFIRMED. Name/address/FEIN/brand matching will not.
