# INS-NAT-FINAL-002B — Controlled national carrier identity production ingest

Does **not** start INS-NAT-FINAL-003. Does **not** write `APPOINTER_RESOLVES_TO` or `USES_BRAND`. Florida remains locked.

## Commands

```powershell
node node_modules\tsx\dist\cli.mjs scripts/check-ins-nat-final-002.ts
node node_modules\tsx\dist\cli.mjs scripts/check-ins-nat-final-002b.ts
node node_modules\tsx\dist\cli.mjs scripts/national/ingest-carrier-identity.ts
node node_modules\tsx\dist\cli.mjs scripts/national/ingest-carrier-identity.ts --execute
```

Schema was applied once in the Supabase SQL Editor. `--execute` must **not** re-apply the migration.

Production first execute: `ins-nat-final-002b-2026-08-27T2043Z`  
Idempotent second execute: `ins-nat-final-002b-2026-08-27T2044Z` (0 new legal insurers / groups / brands / identifiers / memberships).

## Locked source

| Item | Value |
|------|--------|
| NAIC product | LOC-JUN-2026 |
| Zip SHA-256 | `baabd84b0c4d546865e9b28c2e54d7ac1f40146192f5dc0e37eb5e5e0440a260` |
| Parser fingerprint | `9fdc197f2dad28ee9a274b404d9ace58a3be5c9de9a12257ba821f26b71dc39e` |
| 002 dry-run fingerprint | `bad17e96dce6286cdee6e66b84d9fbd8b8e1eeb59834c6996ba3a27319ada50f` |
| Migration SHA-256 | `70B01C012EC825EC02729EBA943D1D310AA11527508F1E6EE9FB1933C19745C5` |

If the parser fingerprint differs, stop and regenerate the 002 dry-run. Do not silently refresh to a newer NAIC release.

## Schema

`supabase/migrations/20260827120000_insurance_carrier_identity.sql`

SQL Editor copy: `docs/national/carriers/INS-NAT-FINAL-002-SQL-EDITOR.md`

Apply once, then `NOTIFY pgrst, 'reload schema';` if PostgREST still 404s the new tables.

## Hold

GPNM lists member CoCode `17686` (US LAW SHIELD LEGAL EXPENSE INS CORP, group `4944`) that is **not** in the company listing files used for the 6,185 legal insurers. That membership is held (not invented as a 6,186th legal insurer). Expected `MEMBER_OF_GROUP` = **3,844** CONFIRMED + **1** hold.

## Brands

14 `consumer_brand` entities, `INTERNAL_ONLY`, `REVIEW_REQUIRED`, no `USES_BRAND`.

## Forbidden in this task

- `APPOINTER_RESOLVES_TO` (TX 1,510 wait for FINAL-003)
- FL DFS digit coincidence as NAIC
- Provider / sitemap / robots / public carrier pages
- Florida OIR / `FL-INS-000+`
