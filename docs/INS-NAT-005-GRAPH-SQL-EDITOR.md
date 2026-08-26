# INS-NAT-005 — Human SQL Editor action package

Production still has **no** national identity graph tables (PostgREST 404 on every graph relation as of this task). This environment has no PostgreSQL URL capable of DDL. Apply the existing additive migration in the Supabase SQL Editor.

Do **not** invent a second architecture. Do **not** populate graph tables after apply.

---

## 1. File

`supabase/migrations/20260826120000_national_identity_graph.sql`

## 2. Verified SHA-256

```
d918e1161fe77a9f582453285dc2372d463f41a4ca5caa15d1b07e411ec1f4c8
```

Compute locally (PowerShell):

```powershell
Get-FileHash supabase\migrations\20260826120000_national_identity_graph.sql -Algorithm SHA256
```

The hash must match before paste. The comment inside the SQL file may still mention an older fingerprint; **the file bytes are authoritative**.

## 3. Additive confirmation

The migration:

- `CREATE TABLE IF NOT EXISTS` only
- `CREATE TYPE` only when missing
- `CREATE INDEX IF NOT EXISTS`
- `ENABLE ROW LEVEL SECURITY` on new tables
- **no** `ALTER TABLE providers`
- **no** `DROP TABLE providers`
- **no** `DELETE FROM providers`
- optional `provider_entity_bridges.provider_id` FK **to** `providers`, not from it

Expected provider impact: **NONE**. Public `providers` row count must remain 170,499.

## 4. Expected tables created

1. `national_entities`
2. `license_credentials`
3. `loa_observations`
4. `contact_observations`
5. `national_relationships`
6. `certification_observations`
7. `regulatory_evidence`
8. `national_identity_conflicts`
9. `provider_entity_bridges`
10. `source_record_links`

Expected enums: `national_entity_kind`, `national_identity_kind`, `identity_confidence`, `regulatory_status`, `contact_observation_kind`.

## 5. Exact steps

1. Open the InsuranceTrustHub Supabase project (`gojyhmbojbwbpiamoktq`) SQL Editor.
2. Confirm you are on production (not a throwaway project).
3. Verify the local file hash above.
4. Paste the **entire** contents of `20260826120000_national_identity_graph.sql`.
5. Run.
6. Run the verification block below in a **new** SQL Editor tab (do not re-run the migration).
7. Leave every graph table **empty**. Do not insert national entities or credentials.

## 6. Post-execution verification

```sql
-- Tables present
SELECT c.relname
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relkind = 'r'
  AND c.relname IN (
    'national_entities',
    'license_credentials',
    'loa_observations',
    'contact_observations',
    'national_relationships',
    'certification_observations',
    'regulatory_evidence',
    'national_identity_conflicts',
    'provider_entity_bridges',
    'source_record_links'
  )
ORDER BY 1;
-- Expect 10 rows.

-- Empty graph (backfill is NOT part of INS-NAT-005)
SELECT 'national_entities' AS t, COUNT(*) FROM national_entities
UNION ALL SELECT 'license_credentials', COUNT(*) FROM license_credentials
UNION ALL SELECT 'provider_entity_bridges', COUNT(*) FROM provider_entity_bridges;
-- Expect 0, 0, 0.

-- Providers untouched
SELECT COUNT(*) AS providers FROM providers;
-- Expect 170499.

SELECT COUNT(*) AS providers_verified FROM providers WHERE verified = true;

-- RLS on
SELECT c.relname, c.relrowsecurity
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN (
    'national_entities', 'license_credentials', 'provider_entity_bridges'
  )
ORDER BY 1;
-- relrowsecurity = true.

-- Unique credential key
SELECT indexname FROM pg_indexes
WHERE tablename = 'license_credentials'
  AND indexname = 'idx_license_credentials_natural';
```

PostgREST check after schema reload: `GET /rest/v1/national_entities?select=id` with service role should return `0-0/0` (206/200), **not** 404.

## 7. If it already exists

Do not re-apply. Verify the unique key `(jurisdiction, entity_kind, license_namespace, license_number)` and RLS, then stop. Empty tables remain acceptable.
