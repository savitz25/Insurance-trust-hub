# Local environment (ops & DFS)

## Goal

Run Florida DFS import/promote and other ops scripts **without pasting service-role keys into chat**.

## Setup (once per machine)

```powershell
cd C:\Users\Michael.Savitsky\insurance-trust-hub

# 1) Copy template
copy .env.example .env.local

# 2) Edit .env.local in your editor — put REAL values only there
#    Supabase → Project Settings → API:
#      Project URL  → SUPABASE_URL and NEXT_PUBLIC_SUPABASE_URL
#      service_role → SUPABASE_SERVICE_ROLE_KEY
```

**Never commit** `.env`, `.env.local`, or `.env.dfs.local` (gitignored via `.env*`).

Optional ops-only file (if you want app secrets separate from DFS):

```powershell
copy .env.example .env.dfs.local
# fill only SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
```

## Load order

Scripts call `loadLocalEnv()` which reads, in order:

1. `.env`
2. `.env.local`
3. `.env.dfs.local`

Variables already set in the shell are **not** overwritten.

## Preflight

```powershell
npm run dfs:env
# or
node node_modules\tsx\dist\cli.mjs scripts/dfs/check-env.ts
```

Expect:

```text
OK  SUPABASE_URL
OK  SUPABASE_SERVICE_ROLE_KEY
Loaded: .env.local
```

## DFS import / promote

After migrations are applied in Supabase SQL Editor:

```powershell
# Dry-run (no DB writes) — does not need service role if --dry-run
npm run dfs:import -- --file data/dfs-raw/AllValidLicensesBusiness.csv --type business --launch-counties-only --dry-run

# Live import (reads .env.local)
npm run dfs:import -- --file data/dfs-raw/AllValidLicensesBusiness.csv --type business --launch-counties-only

npm run dfs:promote -- --dry-run --limit 20
npm run dfs:promote -- --limit 500
```

If `npm` script policy blocks PowerShell, use:

```powershell
node node_modules\tsx\dist\cli.mjs scripts/dfs/import-dfs-csv.ts --file data/dfs-raw/AllValidLicensesBusiness.csv --type business --launch-counties-only
```

## Security

- Service role key bypasses RLS — treat like a root password.
- If a key was ever pasted into chat/email, **rotate it** in Supabase Dashboard → API.
- Do not put real keys in `.env.example` or any committed file.

## Related

- `docs/FLORIDA-DFS-INVENTORY.md` — full DFS pipeline
- `.env.example` — placeholders only
