# My Insurance (Insurance HQ)

Parallel to MoveTrustHub **My Move / Move HQ**, fully isolated on `www.insurancetrusthub.com`.

## Phase 1 + Phase 2

| Feature | Status |
|---------|--------|
| Optional auth (magic link, Google, Facebook, password) | Phase 1 |
| Save agents / agencies | Phase 1 |
| Guest shortlist merge | Phase 1 |
| Prescription drug baskets (sync + email) | **Phase 2** |
| Save calculator results (ACA + Cost Planner) | **Phase 2** |
| Insurance HQ dashboard sections | **Phase 2** |
| Reviews / comparisons | Phase 3 |

## Privacy

- No lead selling / paid placements  
- Research workspace only  
- Tools work without sign-in  

## Schema

Migration: `supabase/migrations/20260728120000_my_insurance.sql` (ITH project)

- `insurance_user_profiles`
- `saved_providers`
- `drug_baskets` / `drug_basket_items` (one primary basket per user in Phase 2)
- `saved_calculator_results` (`calculator_id` + `title` + `snapshot` JSONB)

## Routes (public apex)

- `/my-insurance` — Insurance HQ dashboard  
- `/tools/prescription-drug-list` — build list + **Save to My Insurance**  
- `/calculators/aca-subsidy` — results **Save to My Insurance**  
- `/tools/cost-estimator` — results **Save to My Insurance**  
- Auth: `/auth/insurance/confirm`, `/auth/insurance/callback`, `/api/insurance-auth/*`  

## Guest → auth merge

Session pending actions (`PENDING_SAVE_ACTION_KEY`):

- `provider` | `drug_basket` | `calculator`  

On `SIGNED_IN`, provider merges guest localStorage agents and executes pending save.

## Emails (Resend)

- Welcome, saved provider (P1)  
- Drug basket summary, calculator result summary (P2)  
- Magic link (branded)  

## Monorepo note

When `insurancetrusthub.com` is served by Move monorepo, Insurance code lives under `app/insurance/*` and `lib/insurance/my-insurance/*`. Auth must stay host-aware (never force My Move).
