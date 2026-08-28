# FL-INS-003 — official appointer bridge source audit

Fail-closed. No public official file places **DFS Appointing Entity Number** on the same record as **NAIC CoCode** or **Florida Company Code**.

| Source | Class | Identifiers | Same-record bridge |
| --- | --- | --- | --- |
| DFS All Active Appointments Business CSV | NO_RELEVANT_IDENTIFIER | Appointing Entity Number, Name. No NAIC, FEIN, FL Company Code | No |
| DFS All Active Appointments Individual (prior ingest) | NO_RELEVANT_IDENTIFIER | Same appointing fields | No |
| OIR Active Company Search XML | NO_RELEVANT_IDENTIFIER | FLCompCode, NAICCode, FEIN. No DFS appointing number | No |
| DFS-H2-501 exception form | MANUAL_ONLY | Labels “Company Code” as OIR insurer code; not the bulk Appointing Entity Number table | No |
| eAppoint / MyProfile | BLOCKED | Authenticated | No |
| NAIC LOC-JUN-2026 | NO_RELEVANT_IDENTIFIER | CoCode only | No |

DFS glossary (INS-NAT-007): Appointing Entity Number, Florida Company Code, and NAIC Company Code are **distinct**.

**Public records request required:** `docs/florida/FL-INS-003-public-records-request.md`
