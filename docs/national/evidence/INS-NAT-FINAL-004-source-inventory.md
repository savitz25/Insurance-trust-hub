# INS-NAT-FINAL-004 — Official regulatory/enforcement source inventory

Not Florida State Intelligence. Not Trust Scores. Public rendering remains OFF.

## Existing project (already acquired)

| Source | Status | Rank | Notes |
|--------|--------|------|-------|
| `regulatory_evidence` table | 0 rows (stub) | — | Expand, do not replace |
| CMS FFM RCL/RTL/tracker | In `cms_marketplace_observations` (1.3M) | Keep separate | Program registration/termination ≠ misconduct. Do not migrate into regulatory_evidence |
| NAIC LOC-JUN-2026 company status 0/4/6 | Legal-insurer identity spine | Keep as status | Receivership/liquidation **status ≠ enforcement event** |
| TDI producer/agency lists | License inventory | Not enforcement | |
| DFS appointment CSVs | Appointing entity number + name | Not enforcement | |
| TDI disciplinary-order PDFs | Official orders on tdi.texas.gov | **P1** | PDF extraction; name-only identity unless NPN/NAIC present |
| TDI workers’ comp order HTML lists | Company name + order number | **P2** | Name-only |

## External official families audited

| Source | Authority | Identifiers | Rank | Use this task? |
|--------|-----------|-------------|------|----------------|
| **Complaint indexes and policy counts** `pa9u-9s9w` | TDI / data.texas.gov | **NAIC ID**, org id, year, line, confirmed-complaint count | **P0** | **Yes** — COMPLAINT family, not FINAL_ORDER |
| Insurance complaints: All data `ubdr-4uff` | TDI | Respondent ID + name, no NPN/NAIC | **P2** | No — name/TDI-internal ID only |
| TDI commissioner disciplinary orders (PDF) | TDI | Order number, PDF, respondent name | **P1** | Deferred (PDF; identity incomplete) |
| OIG LEIE | HHS OIG | NPI | DEFERRED | Graph identity is NPN/NAIC, not NPI |
| CMS CMP lists | CMS | Provider CCN/NPI | DEFERRED | Not NPN/NAIC producer spine |
| Florida DFS/OIR discipline | FL | — | **Not this task** | Florida locked |

## Selected first production family

**TDI complaint indexes (`pa9u-9s9w`).**

- Geography: Texas (national identity via NAIC CoCode)
- Respondent: legal insurer (when CoCode validates on LOC-JUN-2026)
- Event grain: organization × year × line of coverage
- Source meaning: TDI **confirmed complaint count** and policy count, not a final disciplinary order
- Identity: exact NAIC ID → CONFIRMED legal insurer; missing/unlisted → UNRESOLVED event stored unattached
- Refresh: Socrata CSV
- Consumer usefulness: coverage of official complaint statistics with explicit “not a finding / not a complete universe” caveat
