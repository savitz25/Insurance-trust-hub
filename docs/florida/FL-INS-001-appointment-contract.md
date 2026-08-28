# FL-INS-001 — Appointment contract

PERSON → `APPOINTED_TO` → `carrier:fl-dfs:{n}`  
AGENCY → `appointed_by` → `carrier:fl-dfs:{n}`

Exact NPN + exact DFS appointing entity number. No inheritance. Appointment TYCL ≠ LOA. County appointments excluded.

**Authoritative final totals:** `docs/florida/FL-INS-001-final.md` and `data/reports/fl-ins-001-final.json`.

## Person (not rewritten)

INS-NAT-013 source: 3,142,628 active rows; 2,962,397 CONFIRMED relationships written. Clock 2026-08-27. This task did not re-ingest 3.2M rows.

## Agency (canonical lock)

Business CSV 59,405 rows (SHA `a9b0d609…`, Last-Modified 2026-08-28).

Official observation grain: **license + appointing entity number + appointment type (TYCL Desc)**. Not agency+appointer only. Not `license|appointer|tycl|issueDate`.

| Metric | Count |
| --- | ---: |
| EXPECTED CURRENT (CONFIRMED, current All Active) | **2,678** |
| RETAINED HISTORICAL (INS-NAT-007, absent from All Active) | **2** |
| PRODUCTION `appointed_by` | **2,680** |
| MISSING / WRONG_TARGET / DUPLICATE | **0** |

Appointers remain `carrier:fl-dfs:{n}`. FL `APPOINTER_RESOLVES_TO` stays **0**. Appointer ≠ legal insurer.

Canonical writer: `scripts/national/fl-ins-001.py`.

## Intermediate writer history (not the current expected set)

A TypeScript runner temporarily inserted 2,563 rows under `license|appointer|tycl|issueDate`. A parallel canonical writer inserted 1,691. Transient total 989 + 2,563 + 1,691 = **5,243**. The 2,563 wrong-grain rows were deleted. Surviving production is 989 + 1,691 = **2,680**.

That execution story must not be reused as the deterministic expected count. Live wrong-grain rows expected on rerun: **0**. Cleanup deletion on rerun: **0** unless a live scan finds new four-part pipe-grain rows.
