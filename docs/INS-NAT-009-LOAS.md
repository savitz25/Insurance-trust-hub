# INS-NAT-009 — Official LOA observation backfill

Lineage: staging → `source_record_links` → `license_credentials` → `national_entities`.

License class, LOA/qualification, appointment type, and consumer category stay separate.

- Observations: **50,368**
- Agencies with ≥1 LOA: **39,613** / 81,943
- Credentials with ≥1 LOA: **42,787** / 110,167
- Fingerprint: `abd49d28604f1149c020f3d17077596fba4df4ed45a8331294ce91d2127cdb1a`
- By state: TX **50,348** · VT **20** · FL **0** · OH **0**
- Provider writes: **0**
- Entity / credential writes: **0**
- Idempotency re-dry-run: insert **0**

## Field roles

| Source | Field | Role | Written? |
|--------|--------|------|----------|
| FL DFS | `lines_of_authority` (License TYCL Desc) | CREDENTIAL_CLASS | No |
| FL DFS appointments | `appointment_type` | APPOINTMENT_TYPE | No |
| TX TDI | `license_types` | CREDENTIAL_CLASS | No |
| TX TDI | `qualifications` | OFFICIAL_LOA | Yes, if lineage exists |
| OH ODI | `license_types` (mailing-list class) | CREDENTIAL_CLASS | No |
| OH ODI | `qualifications` | OFFICIAL_LOA | Empty — 0 rows |
| VT DFR | `license_types` | CREDENTIAL_CLASS | No |
| VT DFR | `qualifications` (LOA NAME) | OFFICIAL_LOA | Yes, 20 graph-linked |
| NV DOI | firm type + product quals | inspect only | No (provisional identity) |
| MS MID | Insurance Producer Entity | CREDENTIAL_CLASS duplicate | No |

## Safety

- Health/Life LOA does not imply Marketplace or Medicare certification.
- Specialty LOA does not change entity classification.
- Status: 49,138 UNKNOWN · 1,230 expired (TX license_status). `ingested_at` unused.
- NV product LOAs (Life/Health/Property/Casualty/Variable) exist in staging and were **not** attached.
