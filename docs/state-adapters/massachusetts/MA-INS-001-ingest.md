# MA-INS-001 — controlled Massachusetts confirmed-agency ingest

Existing InsuranceTrustHub **agencies** only. No new entities. No persons. No WORKS_FOR. No `/massachusetts` launch.

## Run

- run_id: `ma-ins-001-2026-08-27T18-42-14-487Z`
- transform: `ma-ins-001.v1`
- started: 2026-08-27T18:42:14.488Z
- completed: 2026-08-27T18:46:20.722Z
- source SHA-256: `B5DBEB1DCA9B0AF88FBC041927AFF6FCD150508B9995B19BF418B25476BE48BD`
- semantic fingerprint: `c42e7fb2252dcd835641bb274e6baed0b491dc571e811936c0be9f6b70135c40`

## Cohort

| | Count |
|--|------:|
| Source rows | 9,151 |
| Distinct NPN | 9,148 |
| CONFIRMED existing agencies ingested | **7,059** |
| Held net-new NPN | **2,089** |
| Malformed NPN (`9950`, source row 9138) | 1 |

## Production deltas

| Layer | Before | After |
|-------|-------:|------:|
| Agencies | 81,943 | 81,943 |
| Persons | 1,029,860 | 1,029,860 |
| Carriers | 13,461 | 13,461 |
| Providers (indexable) | 170,499 | 170,499 |
| ASSOCIATED_WITH | 52,827 | 52,827 |
| Credentials | 1,523,971 | 1,531,030 (+7,059) |
| MA credentials | 0 | 7,059 |
| MA LOAs | 0 | 18,853 |
| MA contacts | 0 | 21,177 |

Inserted: 7,059 credentials, 18,853 LOAs, 21,177 contacts, 7,059 source_record_links. Domicile stored on credential `raw` (not as location).

## Framing

Correct: “Existing InsuranceTrustHub agencies matched to Massachusetts active Insurance Producer licensing records.”

Incorrect: “Massachusetts agencies = 7,059.”

## Held

`data/reports/ma-ins-001-held-npns.json` — 2,089 REVIEW_REQUIRED_ENTITY_TYPE.

`data/reports/ma-ins-001-malformed-npn.json` — NPN raw `9950` UNRESOLVED.

## Commands

```powershell
npm run check:ma-ins-000
npm run check:ma-ins-001
npx tsx scripts/national/ingest-ma-doi-regulatory.ts
npx tsx scripts/national/ingest-ma-doi-regulatory.ts --execute
```
