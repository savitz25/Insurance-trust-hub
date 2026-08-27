# INS-NAT-013 — Florida DFS individual carrier appointments

`PERSON → APPOINTED_TO → carrier:fl-dfs:{Appointing Entity Number}`

Public person profiles remain disabled. `/carriers` brand pages were not rewritten.

## Source

Portal: https://licenseesearch.fldfs.com/BulkDownload

All Active Appointments — Individual (A–Z splits). Last-Modified `2026-08-27T06:27:45Z`. All 3,142,628 rows `ACTIVE`.

## Executed

| Layer | Count |
|-------|------:|
| New DFS appointing-entity carriers | 11,710 |
| Carrier spine after | 11,944 |
| New `APPOINTED_TO` | 2,962,397 |
| Persons with ≥1 appointment | 495,293 |
| Distinct person/carrier pairs | 2,914,602 |
| Person / credential / LOA / CMS / provider writes | 0 |
| `ASSOCIATED_WITH` | 52,827 unchanged |
| Agency `appointed_by` | 989 unchanged |

Fingerprints:

- relationships `877b17e5fbda02fe793fd0bd759bb3fcdd3e656419b8d2eccec559900c8443bd`
- carriers `ce7388714604f026075a0b59455cb19b200e2779a3349d9190a2249b0748212d`

Carriers are Florida DFS appointing entities, not NAIC companies or consumer brands.
