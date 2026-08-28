# FL-INS-005 — IRFS semantics

Public search: https://irfssearch.floir.gov/

## Grain

**File log number = one filing.** Multiple documents in that filing are not extra filings.

## Status

Keep official Final Action distinct: FILED / PENDING / APPROVED / DISAPPROVED / WITHDRAWN / OTHER. Do not infer “approved rate increase” from an approved filing unless the source rate-change field says so.

Requested change, approved change, effective date, and policyholder impact stay **separate columns** when present. Do not parse PDF prose unless deterministic.

Disclaimer on the search: displayed rate changes may not fully reflect trade-secret claims.

## Coverage

Search cap 2,500. Exhaustive statewide universe is **not** claimed. Partition by Date Filed + line + filing type if a later ingest runs. Identity attach: exact NAIC Company Code when the result includes it; name-only hold.

Industry IRFS (`irfs.floir.gov`) is authenticated submit, not a public bulk dump.
