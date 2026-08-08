# Insurance Trust Hub — Phase 6B1: Real License Backfill Ops

**Date:** 2026-08-07  
**Repo:** standalone `Insurance-trust-hub` (production)

## Goal

Backfill real license numbers + provenance so eligible rows can become `indexable_research`.  
**Do not invent licenses. Prefer fewer real profiles over many weak ones.**

---

## 1. Promotion requirements

| Gate | Required for `indexable_research` |
|------|-----------------------------------|
| Re-checkable license number | Yes (`cleanLicenseNumber`) |
| Regulator source name | Yes |
| Source URL | Preferred (defaults to state lookup) |
| `checkedAt` ISO | Yes (within freshness window) |
| Identity match accepted | Yes |
| Not seed/fallback/generated id | Yes |
| Explicit promote intent | Yes |

**Insufficient alone:** Google rating, BBB, years-in-business, review counts, carrier marketing.

Hard **State license verified** badge (Phase 6A+6B1) requires license + verified flag + **source + checkedAt**.

---

## 2. Workbench

### Admin UI (preferred)
1. Sign in at `/admin/login`
2. Open **License backfill** (`/admin/license-backfill`)
3. Queue lists non-indexable Supabase providers (priority: website, FL/TX/CA/NY, partial evidence)
4. For each row:
   - Look up official DOI/DFS
   - Enter license number, source, source URL, checkedAt
   - Confirm identity match
   - **Save pending** or **Promote indexable** or **Keep suppressed**
5. Or edit full form at `/admin/providers/[id]/edit` (provenance fields on form)

### Offline batch validation
```bash
node scripts/ops-license-backfill-report.mjs ops/license-backfill-batch.example.json
```
Validates batch JSON gates only — does **not** write to Supabase.  
Production writes: admin UI only (session + service role).

---

## 3. Source priority

1. State DOI / DFS / producer lookup (authoritative)
2. Other primary regulator pages
3. Website / Google / BBB — identity corroboration notes only, **never** license authority

FL entry point: https://licenseesearch.fldfs.com/

---

## 4. Matching rules

- Names must reasonably match legal/DBA
- State should match claimed market when possible
- Ambiguous multi-match → **pending** + notes
- No match → **suppressed**

Wrong license attachment is worse than a thin directory.

---

## 5. Data written

Stored in `providers.license_info` JSON:

```json
{
  "licenses": [{
    "state": "FL",
    "license_number": "A123456",
    "type": "agent",
    "verification_url": "https://...",
    "source": "FL DFS Licensee Search",
    "checkedAt": "2026-08-08T15:00:00.000Z",
    "method": "manual",
    "status": "verified",
    "identityMatchAccepted": true,
    "notes": "..."
  }],
  "audit": [{ "at": "...", "method": "manual", "action": "promote_indexable", "license_number": "..." }]
}
```

`providers.verified = true` only when promote gates pass.

---

## 6. Batch strategy

1. Profiles linked from hubs/tools  
2. FL, TX, CA, NY  
3. Strong identity anchors (website, unique name)  
4. Long tail last  

Small verified batches; re-check sample after write.

---

## 7. Indexation impact

- Sitemap / public class use `evaluateProviderPromotion`
- Seed fallback catalog never enters sitemap
- New indexable rows appear only after successful **Promote indexable**

---

## 8. Ops reporting template

| Metric | Count |
|--------|------:|
| Candidates reviewed | |
| Promoted to indexable_research | |
| Left pending | |
| Left suppressed | |

Top failure reasons: no match · ambiguous match · no public license · seed entity · missing provenance

---

## 9. Batch results (this ship)

| Metric | Count |
|--------|------:|
| Candidates reviewed | 0 (tooling ship — no invented backfills) |
| Promoted | 0 |
| Pending | 0 |
| Suppressed | n/a |

**Next:** Operators run FL DFS on priority Supabase rows via `/admin/license-backfill` and record real numbers only.

---

## Guardrails

```bash
node scripts/check-phase6a-integrity.mjs
node scripts/check-phase6b1-promotion.mjs
```
