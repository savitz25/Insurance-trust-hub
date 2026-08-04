# My Insurance — Auth continuity (guest ↔ signed-in)

**Production:** Insurance-trust-hub only (`www.insurancetrusthub.com`)  
**Related:** `docs/MY-INSURANCE-COMPARE-FIX.md`, Phase A–C docs

## Storage (never wipe on auth)

| Key | Role |
|-----|------|
| `ith:my-insurance:v1` | Primary guest plan + shortlist (CoveragePlan / SavedProvider) |
| `ith-my-insurance-compare-tray-v1` | Compare set (slugs + names) |
| `ith-my-insurance-saved-providers-v1` | Legacy guest list (still read for merge) |
| Supabase `saved_providers` | Optional cloud shortlist when signed in |

**Rule:** Sign-in and sign-out must **not** clear localStorage keys above.

## Merge rules (by `providerSlug`)

1. **Always read local first** for HQ shortlist/plan UI (`GuestInsuranceHq`).
2. On **sign-in** (`syncAuthContinuity`):
   - Collect local providers (Phase A store ∪ legacy key).
   - **Import local → cloud** via `mergeGuestProvidersAction` (upsert; empty cloud must not win).
   - **Import cloud → local** for any cloud slug missing locally (status `researching` to avoid shortlist cap fights).
   - Toast when local had data: *“Restored your saved agencies on this device.”*
3. **Display:** cloud ∪ local. Prefer non-empty local over empty cloud dashboard.
4. On **sign-out:** keep local; drop only in-memory cloud slug set for remote-only state.
5. Badge count: `max(guest plan count, cloud∪local slug size, compare tray if needed)`.

## UI

| Surface | Behavior |
|---------|----------|
| `/my-insurance` | Always renders `GuestInsuranceHq` (plan, shortlist, Setup/Report/Compare). Signed-in adds identity strip + optional cloud extras (comparisons, reviews, drug basket, calculators). |
| Header | Persistent **My Insurance** (bookmark icon + badge) top-right desktop **and** mobile (beside hamburger). **Sign in** when signed out; email/sign-out when signed in. |

## Code map

- `lib/my-insurance/auth-continuity.ts` — collect local, import cloud→local  
- `components/my-insurance/my-insurance-provider.tsx` — `syncAuthContinuity`, no clear on merge  
- `components/my-insurance/my-insurance-dashboard.tsx` — unified HQ  
- `components/navbar.tsx` — My Move–style passport control  

## Human tests

1. Clean guest → save 2 providers → HQ shows 2  
2. Sign in → still 2 (not 0); toast restore if applicable  
3. Sign out → still 2  
4. Signed out: **Sign in** on HQ + header; top-right My Insurance works  
5. Signed in: top-right My Insurance works; Sign out works; cloud extras do not replace shortlist  

## Out of scope

Phase D multi-plan, full SSO with Move/Lender, forcing login for Save.
