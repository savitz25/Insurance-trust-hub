# Phase 6C — First Live Backfill + Enrichment Ops Run

**Run date:** 2026-08-08  
**Repo HEAD:** `bf70acc` (6A/6B1/6B2 tooling on `Insurance-trust-hub` main)  
**Operator environment:** local Grok Builder + public production probes

---

## 1. Preconditions confirmed

| Precondition | Status | Notes |
|--------------|--------|--------|
| 6A/6B1/6B2 code on `main` | **Yes** | `bf70acc` |
| Production site up | **Yes** | https://www.insurancetrusthub.com/ 200 |
| `/admin/license-backfill` route | **Yes** | Redirects to `/admin/login` (auth gate) |
| `/admin/enrichment` route | **Yes** | Redirects to `/admin/login` |
| Production `/providers` 6A honesty | **Yes** | “seed catalog”, “not independently verified”, Research tools CTA |
| Local `ADMIN_SECRET` | **Partial** | Present in Move monorepo `.env.local` only |
| Local `GOOGLE_PLACES_API_KEY` | **Partial** | Present in Move monorepo `.env.local` only |
| ITH Supabase **providers** rows | **BLOCKER** | Accessible projects have **`providers` count = 0** |
| ITH project-bound service role in ITH repo | **Missing** | No `.env.local` in `insurance-trust-hub`; Move env projects are multi-table (companies/lenders) with empty `providers` |

### Stop condition hit

**Cannot complete live promote/enrich writes safely:**

1. No real agency rows in `providers` (empty tables on probed Supabase projects).  
2. Production public directory is **FALLBACK seed catalog** (by design under 6A).  
3. Seed/fallback IDs **must not** be promoted (6B1 hard rule).  
4. Without confirmed ITH Vercel ↔ Supabase project mapping, writing into the wrong project risks Move/Lender data coupling.

**Live promotion count: 0**  
**Live Google enrichment count: 0**  
This is correct integrity behavior, not a tooling failure.

---

## 2. Batch size and states worked

| Planned | Actual |
|---------|--------|
| 5–15 FL agencies | **0 promoted** (blocked by empty catalog) |
| State | Florida research only (DOI candidates prepared for next step) |

Public production sample QA (seed profile):

- URL pattern: `/providers/anchor-insurance-agency-albany-ny`
- Seed listing badge: **yes**
- 555 phones: **no**
- Contact form: **disabled** → “Research tools”
- Synthetic reviews: **suppressed**

---

## 3. Promotion results

| Metric | Count |
|--------|------:|
| Candidates reviewed in DB | 0 (empty `providers`) |
| Promoted to `indexable_research` | **0** |
| Left pending | 0 |
| Left suppressed | n/a (seed catalog remains non-indexable) |

### DOI-sourced candidates prepared for operator confirm (not inserted)

From public FL DFS Licensee Detail pages (re-check before write):

| Legal name | License # | City | Official source |
|------------|-----------|------|-----------------|
| WE INSURE, LLC | L062256 | Sunrise | https://licenseesearch.fldfs.com/Licensee/1132052 |
| PRIMERICA FINANCIAL SERVICES, LLC | L013236 | Margate | https://licenseesearch.fldfs.com/Licensee/832915 |

File: `ops/phase6c-fl-doi-candidates.json`

These are **ready for human re-open + Active status confirm**, then admin insert/promote — **not auto-inserted** in this run.

---

## 4. Enrichment results

| Metric | Count |
|--------|------:|
| Enriched with Google | **0** |
| Skipped weak/ambiguous Google | 0 |
| BBB attested | **0** |

Reason: enrichment requires `indexable_research`; none exist yet.

---

## 5. Public QA findings

| Check | Result |
|-------|--------|
| Seed directory research-framed | Pass (`/providers`) |
| Seed profile not hard-verified | Pass |
| Contact form blocked on seed | Pass |
| Synthetic review stack blocked | Pass |
| 555 phones on sample | Pass (none) |
| Sitemap includes seed providers | Expected empty/qualified-only after 6A |

No integrity slips observed on public seed surfaces.

---

## 6. Remaining backlog / next batch plan

### Immediate unblocks (ops)
1. In **Vercel → insurance-trust-hub project**, confirm:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `ADMIN_SECRET`
   - `GOOGLE_PLACES_API_KEY`
2. Copy those into `insurance-trust-hub/.env.local` for local ops (never commit).
3. Confirm `providers` table is the ITH table (not Move companies).
4. Re-open FL DFS URLs above; if **Active**, insert via `/admin/providers/new` or service-role script with full provenance, then **Promote indexable**.
5. Run `/admin/enrichment` **only** on those promoted rows.
6. Expand batch to 5–15 only after first 2 pass end-to-end QA.

### Scripts added this phase
- `scripts/ops-phase6c-preflight.mjs` — env + providers inventory  
- `scripts/ops-phase6c-discover.mjs` / `ops-phase6c-tables.mjs` — project discovery  
- `ops/phase6c-fl-doi-candidates.json` — DOI-sourced FL candidates  
- This report: `ops/PHASE-6C-RUN-REPORT.md`

### Still deferred
- CMS Marketplace Plan Explorer  
- Mass directory generation  
- Lead forms on unverified profiles  

---

## Stop conditions (triggered)

| Condition | Triggered? |
|-----------|------------|
| Empty / non-writable real providers catalog | **Yes** |
| Risk of writing wrong Supabase project | **Yes** (would pause writes) |
| Seed becoming verified | **No** (correctly blocked) |

**Process fix before scale:** bind ITH env → non-empty real providers path, then resume with DOI candidates file.
