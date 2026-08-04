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

- Plans remain **local-only**.  
- `syncAuthContinuity` must not clear local plans.  
- Cloud provider slugs still import into local (active plan / researching).  
- Merge identity: local plan `id` is source of truth; no cloud plan table in this phase.

## Human tests

1. Setup → create plan A → shortlist 2  
2. Setup → **Create as new plan** B → HQ shows B shortlist empty; All plans shows A + B  
3. Open A from library → shortlist 2 again  
4. Archive B → A remains active  
5. Report title includes plan label; All plans link works  
6. Sign in/out → plans still present  

## Files

- `lib/my-insurance/plan-types.ts`, `storage.ts`  
- `components/my-insurance/plans-library.tsx`  
- `app/my-insurance/plans/page.tsx`  
- `guest-insurance-hq.tsx`, `guided-plan-setup.tsx`, `coverage-report.tsx`  
- This doc  
