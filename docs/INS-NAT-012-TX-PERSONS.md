# INS-NAT-012 — Texas individual producers + PERSON→AGENCY

Gated `entity_kind = person` graph. Public person profiles remain disabled.

`PUBLIC_PERSON_PROFILES_ENABLED = false`.

## Executed (production)

| Layer | Count |
|-------|------:|
| New confirmed persons | 330,525 |
| TX credentials attached to existing FL/VT persons | 313,886 |
| TX person credentials | 674,076 |
| TX person LOAs | 733,324 |
| PERSON→AGENCY `ASSOCIATED_WITH` | 52,827 |
| CMS rows attached (UPDATE only) | 154,356 |
| CMS total rows | 1,300,108 unchanged |
| Provider writes | 0 |
| Agency entities | 81,943 unchanged |

Fingerprints (execute manifest):

- persons `49330f66389a9beba7e69a69eee408e6a02a6e81e9062642440409d0c7072097`
- credentials `d0091457cbd1ecd8e67da35f6ec73478843912c5fe55f108e45b2e9d94d5cc60`
- loas `3e1438328d4e2725904486b538ee1ab08680be4cf0dae00a588d1ad9c4902bf9`
- relationships `c6a03cdef735d27833a5c6c0df4770042092ea0e6143d04ba95f51c39f02ff84`
- cms attachments `3fc9c1a2dc6dd278b8be070523d3e329b7a288c851ecea6c72e10cd55af10e5d`

Second exact-manifest dry-run: new persons/credentials/LOAs/relationships/CMS attachments = 0.

## Sources

| Dataset | Resource | Role |
|---------|----------|------|
| Individuals | [kxv3-diwf](https://data.texas.gov/dataset/Insurance-agents-adjusters-and-people-approved-to-/kxv3-diwf) | TX person credentials + official qualifications |
| Associations | [kvqi-vsrr](https://data.texas.gov/dataset/Business-relationships-between-agents-agencies-adj/kvqi-vsrr) | Non-appointment PERSON→AGENCY (`ASSOCIATED_WITH`) |
| Appointments | bupb-23s9 / avjc-7u2m | **Not this task** (carrier appointments) |

Joins are exact NPN only. Names are compatibility evidence, never an identity key.

## Core cohort (execute)

TDI individual license types, comparable to FL Life/Health/General Lines/Personal Lines:

- General Lines Agent
- Life Agent
- Pers Lines Prop and Cas Agent

Excluded from execute: adjusters (including DHS), escrow/title, limited-lines-only, pre-need, surplus-only, MGA, temps, life-settlement, reinsurance, risk manager, specialty.

County Mutual / Life Agt Not Exceeding $25,000: HIGH_CONFIDENCE census only.

## Semantics

- **License type** = credential class (not LOA).
- **Qualification** = official LOA / product authority. Health/Life qualification is not Marketplace or Medicare.
- **kvqi-vsrr** = non-appointment business relationship. FIN531: individuals *associated with* a licensed insurance agency / Designated Responsible Licensed Producer.
- Default relationship_type = `ASSOCIATED_WITH`. Raw `association_type` (Employee, Owner, DRLP, Sub-Agent, …) is stored in `raw`. Not `WORKS_FOR`.
- Missing agency NPN (carriers with NAIC/EIN only, unknown firms) → no forced relationship and no invented agency.
- Association begin dates through 2021 are not proof of current employment. Status/currency stay UNKNOWN unless an end date/status proves historical.

## Freshness

Preserve official TDI issue/expiration. `source_observed_at` = Socrata `rowsUpdatedAt`. `ingested_at` = Trust Hub load time. Downloaded today ≠ license verified today.

## CMS

Re-attach existing `cms_marketplace_observations` by exact NPN. UPDATE `entity_id` / `identity_attachment` only. KIND_CONFLICT stays unattached. Total CMS rows remain 1,300,108.

## Commands

```powershell
npm run check:ins-nat-012
npx tsx scripts/national/backfill-tx-individuals.ts
npx tsx scripts/national/backfill-tx-individuals.ts --execute
npx tsx scripts/national/backfill-tx-individuals.ts   # idempotency dry-run
```

CSVs (gitignored): `C:/Users/Michael.Savitsky/agent-tools/ins-nat-012/`
