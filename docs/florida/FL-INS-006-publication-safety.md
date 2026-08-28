# FL-INS-006 — publication safety

Locked: no mass-publish of graph agencies, people, or legal insurers. No person directory. No `/florida` route in this task. No county pages. No rankings. No Trust Scores. No Google Places. No county-appointment ingest.

`PUBLIC_PERSON_PROFILES_ENABLED = false`. `mayPublishEntityKind('legal_insurer') = false`.

Snapshot generation is read-only (`db_writes = 0`).

## Locked publication regression

| Surface | Count |
|---------|------:|
| providers | 170,499 |
| agencies | 82,071 |
| persons | 1,029,860 |
| legal insurers | 6,185 |
| OIR identifiers | 1,897 |
| Florida appointed_by | 2,680 |
| FL APPOINTER_RESOLVES_TO | 0 |
| provider bridges | 37,515 |
| market observations | 1,409 |
| public graph agencies | 0 |
| public people | 0 |
| public legal insurers | 0 |

No sitemap expansion. No ranking. No Trust Score changes.

## Profile enrichment (existing public providers only)

Unresolved evidence is not counted ready.

| Module | Ready |
|--------|------:|
| Florida credential | 14,834 |
| Florida appointment | 613 |
| CMS | 0 |
| MIR market | 0 |
| Surplus lines | 0 |
| Regulatory | 0 |
| NFIP | 0 |
