# INS-NAT-014 — Texas TDI individual insurance-company appointments

`PERSON → APPOINTED_TO → carrier:tx-tdi-naic:{NAIC ID}`

Public person profiles remain disabled. `/carriers` brand pages were not rewritten. Florida DFS appointing entities were not merged by name or coincidental digits.

## Source

Portal: https://data.texas.gov/dataset/Active-insurance-company-appointments-for-agents-a/bupb-23s9

Dataset `bupb-23s9` — Active insurance company appointments for agents and adjusters. Official TDI / data.texas.gov. Daily. Socrata `rowsUpdatedAt` `2026-08-27T07:25:00.000Z`.

4,403,401 rows. Distinct Agent NPN 499,979. Distinct NAIC ID 1,521. Agent NPN null 18. NAIC ID null 231.

Columns: NAIC ID, Insurance company name, Appointment active date, Appointment type, Agent NPN, Agent name, City, State, Postal code.

No expiration, termination, email, phone, or license number.

Citation: Tex. Ins. Code §§ 4001.201–4001.206; TDI FIN501; dataset bupb-23s9.

TDI defines **NAIC ID** as the number assigned by NAIC to an insurance company or group of companies. That is the official Texas appointing-company identifier. It is **not** a Florida DFS Appointing Entity Number.

Sister datasets (not this task):

- `avjc-7u2m` — agency/business insurance-company appointments
- `kvqi-vsrr` — non-appointment PERSON→AGENCY `ASSOCIATED_WITH` (INS-NAT-012)

## Semantics

| Family | This task |
|--------|-----------|
| License / credential | Unchanged. Appointment type is not a license class. |
| LOA | Unchanged. Appointment type is not an LOA. |
| PERSON→AGENCY `ASSOCIATED_WITH` | Unchanged (52,827). Not written here. |
| Agency `appointed_by` | Unchanged (989). Florida agency-carrier family. |
| PERSON→CARRIER `APPOINTED_TO` | **This task.** Texas individual appointments. |
| Florida individual `APPOINTED_TO` | Unchanged (2,962,397). Separate `source_dataset`. |
| CMS Marketplace | Unchanged (1,300,108 rows). Appointment is not Marketplace evidence. |

Join path: exact canonical NPN only. No name join. No license-number join (source has no license number). Agency-owned NPNs are not attached as persons.

Appointing entity key: `carrier:tx-tdi-naic:{normalized NAIC ID}`. Confirmed when NAIC ID is present and names for that ID are unique or compatible. Conflicting names → REVIEW_REQUIRED (none observed). Missing NAIC → UNRESOLVED (231 rows).

Currency: extract is active-only with no end date → `CURRENT`.

Identity method: exact NPN + exact TDI NAIC ID. Fingerprints are SHA-256 of sorted `source_record_id` / entity keys.

## Executed (production)

| Layer | Count |
|-------|------:|
| New TX appointing-entity carriers | 1,517 |
| Carrier spine after | 13,461 (11,944 FL DFS + 1,517 TX TDI NAIC) |
| New `APPOINTED_TO` | 4,371,782 |
| Persons with ≥1 TX appointment | 489,103 |
| Distinct person/entity pairs | 4,333,657 |
| Person / credential / LOA / CMS / provider writes | 0 |
| `ASSOCIATED_WITH` | 52,827 unchanged |
| Agency `appointed_by` | 989 unchanged |
| Florida `APPOINTED_TO` | 2,962,397 unchanged |
| CMS rows | 1,300,108 unchanged |
| Providers | 170,499 unchanged |

Fingerprints (dry-run / execute manifest):

- relationships `7d49458f594a72659f3bb695dca4680bb13e663d9de99fee505a7d62c8f27556`
- entities `196f31a91486809dbd85841d8de4d01501067077e8c49c038e33518c0fe4fc7c`

Texas appointing entities are TDI NAIC-identified companies (or groups). They are not Florida DFS appointing entities and not consumer brand pages.

## Commands

```powershell
npm run check:ins-nat-014
npx tsx scripts/national/backfill-tx-individual-appointments.ts
npx tsx scripts/national/backfill-tx-individual-appointments.ts --execute
npx tsx scripts/national/backfill-tx-individual-appointments.ts
```

CSV (gitignored): `C:/Users/Michael.Savitsky/agent-tools/ins-nat-014/tdi-individual-appointments.csv`
