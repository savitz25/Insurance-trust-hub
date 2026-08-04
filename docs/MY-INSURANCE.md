# My Insurance (Insurance HQ)

Independent research workspace on `www.insurancetrusthub.com`.

## Phases

| Phase | Features |
|-------|----------|
| 1 | Auth, saved agents, guest merge, branded emails |
| 2 | Drug baskets, calculator result saves |
| 3 | Shortlist compare tray, saved comparisons, auth reviews |

## Schema

- `insurance_user_profiles`, `saved_providers`
- `drug_baskets` / `drug_basket_items`
- `saved_calculator_results`
- `provider_comparisons` / `provider_comparison_items` (Phase 3)
- `reviews` (+ optional `user_id`, `coverage_type`)  -  new reviews default **pending**

Migrations:
- `20260728120000_my_insurance.sql`
- `20260728200000_my_insurance_phase3.sql`

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
