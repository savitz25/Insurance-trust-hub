# INS-NAT-FINAL-001 — National completion audit

Live census: `data/reports/ins-nat-final-001-census.json` (2026-08-27T19:47:13Z).

**NATIONAL NOT COMPLETE.** Florida state rollout (`FL-INS-000+`) remains locked.

## Live graph (exact)

| Layer | Count |
|-------|------:|
| Agencies | 82,071 |
| Persons | 1,029,860 |
| Carriers (provisional appointing entities) | 13,461 |
| Credentials | 1,531,158 |
| LOAs | 1,791,158 |
| ASSOCIATED_WITH | 52,827 |
| Agency `appointed_by` | 989 |
| FL person `APPOINTED_TO` | 2,962,397 (last verified execute; live count timed out) |
| TX person `APPOINTED_TO` | 4,371,782 (last verified execute; live count timed out) |
| Contacts | 144,864 |
| CMS rows | 1,300,108 |
| Regulatory evidence | 0 |
| Certification observations | 0 |
| Provider↔entity bridges | 0 |
| Public providers | 170,499 |
| Public person profiles | disabled |

## Must complete before Florida

1. Legal insurer / NAIC / group / brand spine (current carriers are FL DFS numbers + TX TDI-NAIC keys, unmerged).
2. Appointing-entity → NAIC crosswalk (no name merge).
3. Regulatory/enforcement evidence family (table exists, 0 rows).
4. Agency Trust Report / provider-graph publication contract (0 bridges; dual public directory).
5. National completion gate pass against the checklist in this audit.

## Florida

NOT STARTED. Locked until the national gate passes.
