# FL-INS-002 SQL Editor

**Applied** in Supabase SQL Editor before FL-INS-002B identifier ingest. Do not re-apply unless the CHECK is missing. No provider/publication changes.

```sql
-- FL-INS-002 additive identifier scheme. Apply in SQL Editor before identifier ingest.
-- Does not alter providers, publication, or NAIC uniqueness.

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
