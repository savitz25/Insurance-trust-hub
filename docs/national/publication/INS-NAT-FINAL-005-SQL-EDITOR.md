# INS-NAT-FINAL-005 — SQL Editor copy (apply once)

## File

`supabase/migrations/20260827180000_regulatory_evidence_foundation.sql`

## Gate

INS-NAT-FINAL-005 is the controlled apply + backfill gate. Apply **once**, then:

```text
npx tsx scripts/national/run-ins-nat-final-005.ts --execute
```

After apply, if PostgREST still reports `PGRST204` for `evidence_family`:

```sql
NOTIFY pgrst, 'reload schema';
```

## Additive confirmation

- `ALTER TABLE regulatory_evidence ADD COLUMN IF NOT EXISTS …` only
- unique index on `(source_dataset, record_identifier)`
- RLS remains enabled
- **no** `ALTER TABLE providers`
- **no** `DROP`
- **no** provider / indexability trigger
- **no** sitemap
- **no** public rendering trigger (`publication_readiness` defaults to `NOT_READY`; backfill sets TDI rows to `INTERNAL_ONLY`)

## Paste

```sql
-- INS-NAT-FINAL-004 — Additive expansion of regulatory_evidence.
-- Does NOT alter providers. Does NOT drop columns. Does NOT publish evidence.
-- Apply in SQL Editor under a later gate if ingest needs first-class columns.
-- Current ingest stores taxonomy in raw JSONB on the existing stub table.
--
-- Fingerprint: ins-nat-final-004-v1

ALTER TABLE regulatory_evidence
  ADD COLUMN IF NOT EXISTS evidence_family TEXT,
  ADD COLUMN IF NOT EXISTS evidence_subtype TEXT,
  ADD COLUMN IF NOT EXISTS respondent_kind TEXT,
  ADD COLUMN IF NOT EXISTS source_respondent_raw TEXT,
  ADD COLUMN IF NOT EXISTS source_respondent_identifier TEXT,
  ADD COLUMN IF NOT EXISTS identifier_scheme TEXT,
  ADD COLUMN IF NOT EXISTS match_basis TEXT,
  ADD COLUMN IF NOT EXISTS case_or_order_number TEXT,
  ADD COLUMN IF NOT EXISTS effective_date DATE,
  ADD COLUMN IF NOT EXISTS status_normalized TEXT,
  ADD COLUMN IF NOT EXISTS status_raw TEXT,
  ADD COLUMN IF NOT EXISTS disposition_raw TEXT,
  ADD COLUMN IF NOT EXISTS sanction_raw TEXT,
  ADD COLUMN IF NOT EXISTS currency TEXT,
  ADD COLUMN IF NOT EXISTS document_url TEXT,
  ADD COLUMN IF NOT EXISTS document_sha256 TEXT,
  ADD COLUMN IF NOT EXISTS publication_readiness TEXT NOT NULL DEFAULT 'NOT_READY',
  ADD COLUMN IF NOT EXISTS is_current BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS source_record_id TEXT,
  ADD COLUMN IF NOT EXISTS source_release TEXT;

COMMENT ON COLUMN regulatory_evidence.publication_readiness IS
  'INTERNAL_ONLY / NOT_READY until INS-NAT-FINAL-005 copy/UI contract. Never auto-publish.';

CREATE UNIQUE INDEX IF NOT EXISTS idx_regulatory_evidence_source_record
  ON regulatory_evidence (source_dataset, record_identifier);

ALTER TABLE regulatory_evidence ENABLE ROW LEVEL SECURITY;

NOTIFY pgrst, 'reload schema';
```

## Expected impact

| Object | Change |
|--------|--------|
| `public.providers` | none (170,499) |
| `regulatory_evidence` rows | 5,966 unchanged until `--execute` backfill |
| person / agency identity | none |
| Florida rollout | none |
| Public rendering | none |
