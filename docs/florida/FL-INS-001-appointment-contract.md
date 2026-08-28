# FL-INS-001 — Appointment contract

PERSON → `APPOINTED_TO` → `carrier:fl-dfs:{n}`  
AGENCY → `appointed_by` → `carrier:fl-dfs:{n}`

Exact NPN + exact DFS appointing entity number. No inheritance. Appointment TYCL ≠ LOA. County appointments excluded.

## Person (not rewritten)

INS-NAT-013 source: 3,142,628 active rows; 2,962,397 CONFIRMED relationships written. Clock 2026-08-27. This task did not re-ingest 3.2M rows.

## Agency (this task)

Business CSV 59,405 rows (SHA `5aea3fad…`, Last-Modified 2026-08-28).  
CONFIRMED expected 2,563 (canonical agency NPN + known FL appointer).  
Skipped: no NPN 25 · NPN not a graph agency 53,138 (warranty/limited/etc.) · appointer missing 3,679.

Inserted **2,563** `appointed_by`. Graph 989 → **3,552**. Second execute zero-delta on this set.

Appointers remain `carrier:fl-dfs:{n}`. FL `APPOINTER_RESOLVES_TO` stays **0**.
