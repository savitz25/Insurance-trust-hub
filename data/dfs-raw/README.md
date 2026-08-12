# Florida DFS raw bulk downloads

Place official CSV exports here (not committed):

- `AllValidLicensesBusiness.csv`
- `AllValidLicensesIndividual.csv`
- AllActiveAppointmentsBusiness.csv (Phase 6A — do not commit; ~20MB)

Download: https://licenseesearch.fldfs.com/BulkDownload

## Secrets

Put Supabase credentials in **`.env.local`** (repo root), not here:

```powershell
copy .env.example .env.local
# fill SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
npm run dfs:env
```

See `docs/LOCAL-ENV.md` and `docs/FLORIDA-DFS-INVENTORY.md`.
