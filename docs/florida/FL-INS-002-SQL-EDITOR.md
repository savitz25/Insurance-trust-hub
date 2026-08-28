# FL-INS-002 SQL Editor

**STOP before `fl_oir_company_code` identifier ingest until this is applied.**

The live `national_entity_identifiers.scheme` CHECK does not yet include `fl_oir_company_code`. No DATABASE_URL in this environment. Apply in SQL Editor, then re-run:

`python scripts/national/fl-ins-002.py --execute`

Does not alter `providers`, publication, NAIC uniqueness, or `APPOINTER_RESOLVES_TO`.

```sql
ALTER TABLE national_entity_identifiers
  DROP CONSTRAINT IF EXISTS national_entity_identifiers_scheme_check;

ALTER TABLE national_entity_identifiers
  ADD CONSTRAINT national_entity_identifiers_scheme_check
  CHECK (scheme IN (
    'naic_cocode',
    'naic_group_code',
    'fein',
    'fl_dfs_appointing_entity_number',
    'fl_oir_company_code',
    'tx_tdi_naic_id',
    'cms_medicare_contract_id',
    'cms_hios_issuer_id'
  ));

COMMENT ON TABLE national_entity_identifiers IS
  'naic_cocode is canonical legal-insurer identity. fl_oir_company_code is additive, only when the same official OIR record also carries NAIC CoCode.';
```
