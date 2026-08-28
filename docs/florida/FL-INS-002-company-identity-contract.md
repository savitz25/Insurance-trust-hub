# FL-INS-002 — OIR company identity contract

Canonical legal-insurer identity remains **`legal-insurer:naic:{CoCode}`**.

Florida Company Code is **`fl_oir_company_code`**, additive, only when the **same official OIR record** also carries NAIC CoCode.

| Rule | Contract |
| --- | --- |
| Exact NAIC on OIR record matching national spine | CONFIRMED `exact_naic_cocode_same_official_record` |
| OIR NAIC absent from national 6,185 | REVIEW_REQUIRED — do not mint blindly |
| FL Company Code, no NAIC | HIGH_CONFIDENCE_CANDIDATE — identifier observation only, no legal-insurer mint |
| Name / address / phone / brand | never identity |
| DFS Appointing Entity Number | not on this source; **no** `APPOINTER_RESOLVES_TO` |
| Digit coincidence | REVIEW_REQUIRED |

Do not merge NAIC, Florida Company Code, and DFS appointing number into one “company number.”

Production dry-run: **1,959** OIR companies CONFIRMED to existing legal insurers (**1,928** distinct NAIC). **6** OIR NAIC values not on the national spine (held). **2,007** companies without NAIC (held). **0** new legal insurers minted.

Identifier inserts wait on SQL Editor (`docs/florida/FL-INS-002-SQL-EDITOR.md`).
