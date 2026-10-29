# INS-DB-PREPRODUCTION-PROOF-001

Retained local proof for Insurance publication eligibility. This directory is not PR #119 and it is not a Production change.

PR #119 stays at `ac21c5c89980832ce3b2cc9effb8c3b286f4250d`.

## What is here

- `sql/01-live-shape-plus-columns.sql` copies the live grant and policy shape and adds the seven nullable columns.
- `sql/02-index-concurrently.sql` is the partial index. It runs only on the local cluster.
- `sql/03-least-privilege-local-only.sql` revokes table DML from `anon` and `authenticated` on the local cluster.
- `security/live-catalog.json` is the read-only Supabase catalog inspection.
- `src/run-proof.mts` loads synthetic rows, calls the TypeScript gate in the PR #119 worktree, and writes `results/proof-result.json`.
- `data/db` is the retained PostgreSQL 17.6 data directory. It is gitignored and is not deleted after a run.

## Command

From this directory, with Node 22 on `PATH`:

```
$env:NODE_OPTIONS = $null
$env:PATH = 'C:\Users\Michael.Savitsky\.local-node\node-v22.18.0-win-x64;' + $env:PATH
& 'C:\Users\Michael.Savitsky\insurance-ins-seo-fl-integration-001\node_modules\.bin\tsx.cmd' --tsconfig 'C:\Users\Michael.Savitsky\insurance-ins-seo-fl-integration-001\tsconfig.json' '.\src\run-proof.mts'
```

The cluster listens on `127.0.0.1:55432` only while the script runs. The password in the script is a local dummy. No Production credential is used.

The read-only catalog shows PostgreSQL 17.6 on `x86_64-pc-linux-gnu`, locale provider `i`, `datlocale` `en-US`, and `datcollate`/`datctype` `en_US.UTF-8`. Linux init uses `--locale=en_US.UTF-8 --locale-provider=icu --icu-locale=en-US`. A Windows run keeps the ICU locale and does not claim that Linux match. `security/production-collation.sanitized.json` has the target settings. The full live catalog stays local.

County totals in `results/proof-result.json` exclude `fx-%` fixture slugs. The sitemap check changes the process directory to the PR #119 worktree only long enough to import `app/sitemap.ts`, because that import reads cohort files from the current directory. No Production DDL is in this package.
