# My Insurance — Compare continuity fix pack

**Production:** Insurance-trust-hub only (`www.insurancetrusthub.com`)  
**Scope:** Encoding, nav dedupe, compare tray persistence. **Not** Phase D multi-plan.

## Storage keys (source of truth)

| Key | Purpose |
|-----|---------|
| `ith:my-insurance:v1` | Guest plan + shortlist (`MyInsuranceState`) |
| **`ith-my-insurance-compare-tray-v1`** | **Compare set** (`CompareTrayItem[]`: `{ slug, name }`, max 4) |

Module: `lib/my-insurance/compare-storage.ts`  
Constant: `COMPARE_TRAY_KEY` in `lib/my-insurance/constants.ts`

Events: `ith-compare-tray` (same-tab), `storage` (cross-tab).

## Root cause (Bug 3)

- **Add to compare** wrote the tray correctly.
- **`/my-insurance/compare`** only resolved providers from URL `?add=` slugs.
- Opening HQ/compare without query params always showed the empty state even when the tray had 2+ agencies.

## Fix

1. **`CompareSession`** (`components/my-insurance/compare-session.tsx`)  
   - On mount, if URL has no slugs and tray has items → `router.replace(/my-insurance/compare?add=…)`  
   - Empty UX by count: **0** → “Select 2-4…”, **1** → “Add one more…”, **≥2** → table after hydrate  
2. Profile / shortlist / signed-in HQ write the **same** tray via `addToCompareTray`.  
3. Floating `CompareTray` continues to link with `?add=` for immediate load.  
4. Guest HQ: secondary chips **Setup · Report · Compare**; load shortlist into compare when ≥2 shortlisted.

## Nav (Bug 2)

- **Single** My Insurance entry: outline CTA button (desktop) + one mobile link.  
- Badge = max(guest shortlist, cloud shortlist, or compare size when shortlist empty).  
- `NAV_LINKS` no longer includes a second My Insurance / ALL-CAPS duplicate.  
- Footer RESOURCES: one “My Insurance” → `/my-insurance`.

**Files:** `components/navbar.tsx`, `components/footer.tsx` (already single).

## Encoding (Bug 1)

| Before (mojibake) | After (ASCII / clean Unicode) |
|-------------------|-------------------------------|
| `Select 2â€"4 agencies to compare` | `Select 2-4 agencies to compare` |
| `MY INSURANCE Â· COMPARE` | `My Insurance · Compare` |
| `Insurance HQ Â· Directory` | separators use ` · ` or ASCII `-` |

Sweep touched: compare page, dashboard, provider-compare-view, write-review-form, drug basket UI, emails, `actions/my-insurance.ts`. Prefer ASCII ranges (`2-4`) for critical empty-state copy.

## QA script (guest-first)

1. Signed out → open agency A → **Add to compare**  
2. Agency B → **Add to compare**  
3. Go to `/my-insurance/compare` (no query) → both appear side-by-side after hydrate  
4. Hard refresh with `?add=` still in URL, or clear URL and open again → tray restores  
5. `/my-insurance` → **Compare (2)** chip when tray ≥ 2  
6. Confirm single **My Insurance** in header + mobile menu  
7. No `â€` / `Â·` on HQ, compare, breadcrumbs  

## Files touched (this pack)

- `lib/my-insurance/compare-storage.ts` (existing tray API)  
- `lib/my-insurance/constants.ts` — `COMPARE_TRAY_KEY`  
- `components/my-insurance/compare-session.tsx` (**new**)  
- `components/my-insurance/compare-provider-button.tsx`  
- `components/my-insurance/compare-tray.tsx`  
- `components/my-insurance/guest-insurance-hq.tsx`  
- `components/my-insurance/my-insurance-dashboard.tsx`  
- `components/my-insurance/provider-compare-view.tsx`  
- `components/navbar.tsx`  
- `app/my-insurance/compare/page.tsx`  
- Encoding cleanups in emails / drug basket / actions  
- This doc  

## Out of scope

Phase D multi-plan library, cloud sync of compare tray, full directory redesign.
