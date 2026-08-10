# My Insurance (Insurance HQ)

Independent research workspace on `www.insurancetrusthub.com`.

## Phases

| Phase | Features |
|-------|----------|
| 1 | Auth, saved agents, guest merge, branded emails |
| 2 | Drug baskets, calculator result saves |
| 3 | Shortlist compare tray, saved comparisons, auth reviews |
| Marketplace 3 | Plan research saves (cost + ACA subsidy + landscape provenance) |

## Schema

- `insurance_user_profiles`, `saved_providers`
- `drug_baskets` / `drug_basket_items`
- `saved_calculator_results` (+ optional `zip`, `state`, `county`, `used_live_marketplace`, `plan_year`, `updated_at`)
- `provider_comparisons` / `provider_comparison_items` (Phase 3)
- `reviews` (+ optional `user_id`, `coverage_type`)  -  new reviews default **pending**

Migrations:
- `20260728120000_my_insurance.sql`
- `20260728200000_my_insurance_phase3.sql`
- `20260806120000_ensure_drug_baskets.sql` (idempotent re-apply of drug basket tables + RLS)
- `20260810200000_saved_calculator_marketplace_meta.sql` (list columns for Marketplace research saves)

### Marketplace plan research saves

| Layer | Role |
|-------|------|
| Snapshot builder | `lib/marketplace/research-snapshot.ts` |
| Save CTA | `SaveCalculatorButton` on cost / ACA subsidy results |
| Cloud table | `saved_calculator_results` (RLS: own rows only) |
| HQ list | My Insurance → **Saved plan research** |

Payload is compact JSON (`marketplaceResearch` v1): market snapshot, path examples, FPL/assistance summary, `usedLiveMarketplace`, honesty provenance. No CMS raw dumps, no API keys.

Guest: device plan snapshot + auth prompt for cloud. Signed-in: cloud insert + best-effort Resend summary email.

### Prescription drug basket flow

| Layer | Storage | Role |
|-------|---------|------|
| Tool draft | `localStorage` `ith:prescription-basket:v1` | Device-only until Save |
| Account cloud | `drug_baskets` + `drug_basket_items` | Source of truth when signed in |
| Account mirror | `localStorage` `ith:my-insurance-drug-basket:v1` | Instant HQ display after save |

**Save to My Insurance** requires auth, then idempotent upsert (clear items + insert).  
**HQ:** signed-in extras → Prescription drug basket (client re-fetches so stale RSC cannot hide a just-saved list).  
**Tool:** `/tools/prescription-drug-list?load=account` preloads the account basket for edit.  
**Clear all** on the tool clears the device draft only, unless the user confirms deleting the account basket.

If Save fails with “storage is not available”, apply `20260806120000_ensure_drug_baskets.sql` on the Insurance Supabase project.

## Routes

- `/my-insurance`  -  HQ dashboard  
- `/my-insurance/compare`  -  side-by-side (query `add=` slugs)  
- `/tools/prescription-drug-list`  
- `/calculators/aca-subsidy`, `/tools/cost-estimator`  
- Auth: `/auth/insurance/*`, `/api/insurance-auth/*`  

## Shortlist vs compare

- **Shortlist** = `saved_providers` (Save to My Insurance)  
- **Compare tray** = localStorage (up to 4) + optional cloud save to `provider_comparisons`  

## Reviews

- Auth required via My Insurance form  
- Status `pending` until moderated  
- Published reviews appear on provider profiles (existing published query)  
- User sees own reviews (any status) in HQ  

## Privacy

No lead selling, no paid placements, no invented verification badges.
