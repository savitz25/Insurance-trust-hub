# My Insurance — Auth continuity (guest ↔ signed-in)

**Production:** Insurance-trust-hub only (`www.insurancetrusthub.com`)  
**Related:** `docs/MY-INSURANCE-COMPARE-FIX.md`, `docs/MY-INSURANCE-PHASE-D.md`

## Storage (never wipe on auth)

| Key | Role |
|-----|------|
| `ith:my-insurance:v1` | Multi-plan library + providers (`plans[]`, `activePlanId`, `savedProviders`) |
| `ith-my-insurance-compare-tray-v1` | Global compare set (slugs + names) |
| `ith-my-insurance-saved-providers-v1` | Legacy guest list (still read for merge) |
| Supabase `saved_providers` | Optional cloud shortlist when signed in (**no** cloud plans table) |

**Rule:** Sign-in and sign-out must **not** clear localStorage keys above.  
**Rule:** Empty cloud must **never** drop or replace multi-plan local state.

## Merge rules (Phase D)

### Local plan library

- Source of truth for plans is always local.
- `syncAuthContinuity` snapshots plan count before/after and never clears `plans[]`.
- If cloud returns zero providers, skip cloud→local import entirely.

### Provider union

| Layer | Identity |
|-------|----------|
| **Local membership** | `(planId, providerSlug)` — same agency can live on plan A and plan B |
| **Cloud table** | `providerSlug` only (flat); local→cloud de-dupes by slug for upload |
| **`createdAt`** | **Sparingly** — fallback stamp when `savedAt`/`updatedAt` missing; **not** used as merge key |

### On sign-in (`syncAuthContinuity`)

1. Snapshot local plans.  
2. Collect local providers (Phase D store ∪ legacy) → **import local → cloud** if any.  
3. If cloud has rows: **import cloud → local** onto **active** plan only when `(activePlanId, slug)` is missing (status `researching`).  
4. Toast on explicit sign-in when local had data: *“Restored your saved agencies on this device.”*  
5. Display HQ always from local (`GuestInsuranceHq`); cloud extras are additive only.

### On sign-out

Keep full multi-plan library + compare tray; drop only in-memory cloud slug set for remote-only UI.

## UI

| Surface | Behavior |
|---------|----------|
| `/my-insurance` | Always `GuestInsuranceHq` (active plan shortlist). Signed-in adds identity + optional cloud extras. |
| `/my-insurance/plans` | Multi-plan library |
| Header | Persistent **My Insurance** + Sign in / Sign out |

## Code map

- `lib/my-insurance/auth-continuity.ts` — `collectLocalProvidersForMerge`, `importCloudProvidersIntoLocal`, `snapshotLocalPlans`, `(planId, slug)` keys  
- `components/my-insurance/my-insurance-provider.tsx` — `syncAuthContinuity`  
- `components/my-insurance/my-insurance-dashboard.tsx` — unified HQ  
- `components/navbar.tsx` — passport control  

## Human tests

1. Guest → save 2 on plan A → HQ shows 2  
2. Create plan B → shortlist 1 → switch A/B shows 2 vs 1  
3. Sign in → both plans remain; shortlists intact  
4. Sign out → still both plans  
5. Signed out: **Sign in** on HQ + header; top-right My Insurance works  

## Out of scope

Full SSO with Move/Lender, cloud-hosted plan library, forcing login for Save.
