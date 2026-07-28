# My Insurance (Insurance HQ) — Phase 1

Parallel to MoveTrustHub **My Move / Move HQ**, fully isolated on `www.insurancetrusthub.com`.

## Patterns reused from My Move

| My Move | My Insurance |
|---------|----------------|
| Optional auth; tools work without sign-in | Same |
| Magic link default + password + Google + Facebook | Same |
| Guest pending save → merge after auth | Guest shortlist in localStorage + pending save |
| Heart/save CTA on profiles | **Save to My Insurance** on `/providers/[slug]` |
| Dashboard HQ | `/my-insurance` Insurance HQ |
| Supabase Auth + RLS tables | `insurance_user_profiles`, `saved_providers`, Phase 2 scaffolds |
| Resend branded emails | Welcome + save confirmation |

## Auth setup (Supabase dashboard)

1. Enable Email OTP / magic link  
2. Enable Google provider (Site URL + redirect `https://www.insurancetrusthub.com/auth/callback`)  
3. Enable Facebook provider (same callback)  
4. Run migration: `supabase/migrations/20260728120000_my_insurance.sql`  
5. Optional: set `RESEND_API_KEY` for branded magic links + transactional mail  

## Routes

- `/my-insurance` — Insurance HQ dashboard  
- `/auth/callback` — OAuth code exchange  
- `/auth/confirm` — magic link token verify  
- `/api/auth/magic-link` — POST email magic link  
- `/api/auth/google` · `/api/auth/facebook` — OAuth kickoff  

## Phase 2 attach points

- Drug baskets: tables `drug_baskets` / `drug_basket_items` ready  
- Calculator saves: `saved_calculator_results` ready  
- Wire Save CTAs on `/calculators/*` and prescription tool  

## Privacy

- No lead selling / paid placements  
- Research workspace only  
- Sign-out from HQ  
- Export/delete planned for later (not Phase 1)  
