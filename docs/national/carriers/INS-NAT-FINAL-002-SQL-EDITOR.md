# INS-NAT-FINAL-002 — SQL Editor copy (do not apply in this task)

## File

`supabase/migrations/20260827120000_insurance_carrier_identity.sql`

## Gate

INS-NAT-FINAL-002B is the controlled apply gate. Apply **once**, then ingest with `--execute`.

After apply, if PostgREST still reports `PGRST205` for the new tables:

```sql
NOTIFY pgrst, 'reload schema';
```

## Additive confirmation

- `ALTER TYPE ... ADD VALUE IF NOT EXISTS` for `legal_insurer`, `insurance_group`, `consumer_brand`
- `CREATE TABLE IF NOT EXISTS` for `national_entity_identifiers` and `national_entity_aliases`
- `CREATE UNIQUE INDEX IF NOT EXISTS` / `CREATE INDEX IF NOT EXISTS`
- `ENABLE ROW LEVEL SECURITY` on the new tables
- **no** `ALTER TABLE providers`
- **no** `DROP`
- **no** provider / indexability trigger
- **no** sitemap

Existing `national_entities` rows are untouched. Existing `carrier` appointing entities remain appointing entities.

## Expected impact

| Object | Change |
|--------|--------|
| `public.providers` | none (170,499) |
| person / agency identity | none |
| Florida rollout | none |
| Graph data | none until a later ingest |

## Hash

SHA-256 (file bytes):

```
70B01C012EC825EC02729EBA943D1D310AA11527508F1E6EE9FB1933C19745C5
```

```powershell
Get-FileHash supabase\migrations\20260827120000_insurance_carrier_identity.sql -Algorithm SHA256
```
