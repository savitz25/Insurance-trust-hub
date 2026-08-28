# FL-INS-001 — Canonical baseline (authoritative)

Locked by FL-INS-001C. Do not treat 5,243 / 3,552 / 6,242 / 2,563-as-final / 989-as-current-total as the production baseline.

## Production

| Metric | Count |
| --- | ---: |
| DFS Business appointment source rows | 59,405 |
| EXPECTED CURRENT (CONFIRMED, current All Active) | **2,678** |
| RETAINED HISTORICAL | **2** |
| PRODUCTION `appointed_by` | **2,680** |
| MISSING | 0 |
| WRONG_TARGET | 0 |
| DUPLICATE | 0 |
| Wrong-grain (`license\|appointer\|tycl\|issueDate`) live | 0 |

Retained historical relationship IDs (absence from All Active is not a proven termination):

- `31c6fbf8-3b84-4eb6-9baa-c750fc77c473`
- `ea5441f1-97a6-4137-a2bd-74e0ae37e656`

## Grain

`DFS business license + DFS appointing entity number + appointment type`.

Graph uniqueness: `(from_entity_id, to_entity_id, relationship_type, source_dataset, source_record_id)`.

81 agency/appointer pairs legitimately have multiple rows. Do not collapse to one edge per pair.

## Coverage (not quality/ranking)

| Population | Count |
| --- | ---: |
| Canonical agencies with ≥1 FL appointment | 1,628 |
| FL-credentialed among those | 1,605 |
| FL-credentialed agencies without appointment evidence | 55,334 |
| Unresolved current appointment grains held | 53,126 |
| FL appointers | 12,030 |
| FL `APPOINTER_RESOLVES_TO` | 0 |

UNRESOLVED grains were not written as weak agencies.

## Writer

Canonical: `scripts/national/fl-ins-001.py`.

`scripts/national/run-fl-ins-001.ts` remains the TYCL census runner. It must not re-insert four-part pipe grain. `--execute` on that file only deletes currently live conflicting pipe-grain rows (expected 0).

## Next

FL-INS-002 — OIR COMPANY MASTER / NAIC CONFIRMED CROSSWALK is **not** started.
