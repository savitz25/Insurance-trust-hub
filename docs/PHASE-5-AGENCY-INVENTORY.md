# Phase 5 — Stabilize & enrich agency inventory

**Repo:** `savitz25/Insurance-trust-hub`  
**Surface:** Florida DFS–verified **agencies/business entities** only (no individual bulk dump).

## Goals

1. Finish controlled business promote under per-county caps  
2. Clearer agency cards & profiles (license, LOA tags, city/county, phone, verified source/date)  
3. Honest LOA specialty tags from DFS only  
4. Hub UX: verified counts, “Showing X of Y”, specialty chips  
5. Appointments deferred until data + copy are safe  

## Non-goals

- Bulk import `AllValidLicensesIndividual.csv` producers onto public hubs  
- Invent websites, ratings, or Medicare-certified claims from DFS  
- Lead-gen funnels / get-quote hard sells  

## LOA specialty tags

Source: `lib/dfs/loa.ts`

| DFS LOA signals | Public tag |
|-----------------|------------|
| Health / accident / disability | Health |
| Life / annuity | Life |
| Property / casualty / general lines | Property & Casualty |
| Personal lines / auto / homeowners | Personal Lines |
| Agency LOAs / business entity | Agency + Independent Agency |

**Never** map DFS LOA → Medicare-certified or carrier appointments.

## Promote (ops)

```powershell
npm run dfs:env
npm run dfs:status
# agencies only (default)
npm run dfs:promote -- --entity business
npm run dfs:promote -- --county broward --entity business --limit 200
```

Use `--entity all` only for emergency backfill; Phase 5 product rule is **business**.

**Required:** `SUPABASE_SERVICE_ROLE_KEY` must be the true **service_role** secret (JWT `"role":"service_role"`).  
If Vercel accidentally stores the anon key as `SUPABASE_SERVICE_ROLE_KEY`, `dfs:status` / promote will see zero staged rows (RLS) while public `/api/inventory/health` still shows live verified counts.

## Appointments (Workstream D)

**Deferred.** Tables `dfs_appointments` exist in schema, but no safe consumer wiring ships in Phase 5.

When ready:

1. Import Active Appointments CSV for **promoted agencies only**  
2. Store as labeled secondary data  
3. UI copy must say: *regulatory appointment snapshot, not an endorsement*  

See `docs/FLORIDA-DFS-INVENTORY.md`.

## Consumer wiring

| Surface | Behavior |
|---------|----------|
| Hub cards | License #, LOA chips, city/county, phone, verified badge |
| Hub filters | `?loa=health\|life\|pc\|personal\|agency` |
| Profiles | Licensed-for / location / how verified / research next steps |
| Health | `/api/inventory/health` |

## Acceptance checklist

- [x] Agencies remain only bulk public listing source  
- [x] Launch hubs keep strong verified counts (caps from Phase 4)  
- [x] Cards/profiles emphasize research fields  
- [x] LOA tags honest (no Medicare from DFS)  
- [x] No individual bulk dump in promote default  
- [x] Appointments documented as deferred  
