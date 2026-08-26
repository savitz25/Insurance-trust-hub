# INS-NAT-011 — apply CMS evidence table (SQL Editor)

Paste **only** `supabase/migrations/20260826180000_cms_marketplace_observations.sql` into the Supabase SQL Editor.

This creates `cms_marketplace_observations`. It does **not** touch `providers`.

`entity_id` is nullable so unmatched CMS NPNs stay staged until a later state person graph can join on exact NPN.

After it exists, run:

```text
npx tsx scripts/national/backfill-cms-marketplace.ts --execute
```
