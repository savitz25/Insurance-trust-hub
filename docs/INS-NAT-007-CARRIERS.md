# INS-NAT-007 — Carrier spine + Florida appointment relationships

Identifier scheme: **Florida DFS Appointing Entity Number** (`carrier:fl-dfs:{number}`).

This field is **not** an NAIC company code. Official DFS glossary lists Appointing Entity Number, Florida Company Code, and NAIC Company Code as distinct. Observed values are 5- and 6-digit.

Persisted (CONFIRMED only):

- 234 carrier entities
- 989 `appointed_by` relationships (FL)
- 984 CURRENT / 5 HISTORICAL

Source: 30,486 `dfs_appointments` (all ACTIVE). 989 attach through `producer_id` → `source_record_links` (`dfs_producers`) → `national_entities`. 29,497 appointments belong to producers outside the confirmed-core agency graph (mostly warranty / limited-line) and were **not** used to create agencies.

Public `providers` unchanged (170,499). `/carriers/[slug]` curated brand pages were not rewritten.

Florida appointment coverage ≠ national appointment coverage.
