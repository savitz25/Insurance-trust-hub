# My Insurance Phase D — Multi-plan library

**Production:** Insurance-trust-hub only (`www.insurancetrusthub.com`)  
**Parity:** My Move reports — multiple coverage research **plans**, one **active** plan for HQ shortlist/report.

## Storage

| Key | Role |
|-----|------|
| `ith:my-insurance:v1` | Plans + providers (version field `1 \| 2`; migrated in `normalizeState`) |
| `ith-my-insurance-compare-tray-v1` | **Global** compare tray (not plan-scoped) |

```ts
MyInsuranceState {
  version: 1 | 2;
  activePlanId: string | null;  // preferred plan for HQ
  plans: CoveragePlan[];        // status: active | archived
  savedProviders: SavedProvider[]; // planId + plan.savedProviderIds
}
```

### Rules

1. Exactly one preferred active when any non-archived plan exists (`activePlanId`).  
2. Shortlist cap **3 per active plan**.  
3. Creating a plan via setup: **Update current** or **Create as new** (does not archive siblings).  
4. Switch plan → HQ shortlist/snapshots for that plan only; providers not orphaned.  
5. Migration: backfill `planId` on providers; promote version → 2.  
6. Provider identity on a plan: **`(planId, providerSlug)`** — same agency may appear on two plans.  

### APIs (`lib/my-insurance/storage.ts`)

`createPlan`, `setActivePlan`, `listAllPlans`, `listActivePlans`, `duplicatePlan`, `archivePlan`, `deletePlan`, `renamePlan`, `getPlanStats`, `getPlanById`

## Routes

| Path | Purpose |
|------|---------|
| `/my-insurance` | HQ for **active** plan |
| `/my-insurance/plans` | Library |
| `/my-insurance/report` | Report for active (or `?planId=`) |
| `/my-insurance/setup` | Guided setup + create-as-new |
| `/my-insurance/compare` | Global compare tray |

## Auth merge (D.6)

Plans are **local-only** (no cloud plan table). Rules:

| Rule | Behavior |
|------|----------|
| Never drop local plans | Empty cloud must not clear `plans[]` / `activePlanId` |
| Provider union | Local membership by **`(planId, providerSlug)`** |
| Cloud import | Additive only onto **active** plan as `researching` if that pair is missing |
| Local → cloud | Flat by `providerSlug` for Supabase `saved_providers` (optional overlay) |
| `createdAt` | Used **sparingly** — only as fallback stamp when `savedAt`/`updatedAt` missing; **not** merge identity |
| Sign-out | Keep full local multi-plan + compare tray |

Implementation: `lib/my-insurance/auth-continuity.ts` + `syncAuthContinuity` in `my-insurance-provider.tsx`.  
Also see `docs/MY-INSURANCE-AUTH-CONTINUITY.md`.

## Acceptance criteria

- [x] ≥2 non-archived plans; switch from library/HQ  
- [x] Shortlist plan-scoped; switch changes visible providers  
- [x] Rename / archive / delete (confirm) cleans providers  
- [x] Report reflects active or `?planId=`  
- [x] Guest path localStorage; refresh safe  
- [x] Sign-in does not wipe multi-plan local state  
- [x] `/my-insurance/plans` linked from HQ  
- [x] Docs + Insurance-trust-hub SHA  

## Human tests

1. Setup plan A → shortlist 2 agencies  
2. Create plan B (new) → shortlist 1 different agency  
3. Library shows both; switch to A → see 2; switch to B → see 1  
4. Rename B; archive A; delete confirm on a duplicate test plan  
5. Report for active plan; copy still works  
6. Sign out / sign in → plans remain  

## Files

- `lib/my-insurance/plan-types.ts`, `storage.ts`, `auth-continuity.ts`  
- `components/my-insurance/plans-library.tsx`  
- `app/my-insurance/plans/page.tsx`  
- `guest-insurance-hq.tsx`, `guided-plan-setup.tsx`, `coverage-report.tsx`  
- This doc  
