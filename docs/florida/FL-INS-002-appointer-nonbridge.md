# FL-INS-002 — appointer non-bridge

Hard rule: do **not** create

`carrier:fl-dfs:{n} → APPOINTER_RESOLVES_TO → legal-insurer:naic:{cocode}`

from name, digits, address, phone, brand, or Florida Company Code alone.

The OIR Active Company Search XML **does not contain** DFS Appointing Entity Number. Same-record proof is therefore **impossible** from this source.

**FL `APPOINTER_RESOLVES_TO` remains 0.**

## The 17 digit coincidences

Re-audited against OIR company master. An OIR row may have NAIC = those digits, or FL Company Code = those digits. That is **not** a DFS appointing number on the same record.

All 17 stay **REVIEW_REQUIRED**. None promoted.

FL-INS-003 is the dedicated appointer bridge attempt.
