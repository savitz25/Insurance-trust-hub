# My Insurance Phase A — Guest-first HQ + data model

**Production:** `www.insurancetrusthub.com` ← **Insurance-trust-hub** only (not Move monorepo).

## Acceptance map

| Spec | Implementation |
|------|----------------|
| `CoveragePlan` / `SavedProvider` / `MyInsuranceState` | `lib/my-insurance/plan-types.ts` |
| Storage key `ith:my-insurance:v1` | `MY_INSURANCE_STORE_KEY` in `constants.ts` |
| `loadState` / `saveState` / `upsertPlan` / `archivePlan` / `upsertSavedProvider` / `removeSavedProvider` / `listActivePlans` | `lib/my-insurance/storage.ts` |
| `/my-insurance` real HQ | Guest: `guest-insurance-hq.tsx`; signed-in: existing dashboard |
| Save on `/providers/[slug]` | `SaveProviderButton` → upsert + toast **Open HQ** |
| Status chips | researching · shortlisted · reached_out · done |
| Nav | Primary nav **My Insurance** → `/my-insurance`; footer RESOURCES link |

## Model

```ts
MyInsuranceState = { version: 1; activePlanId; plans: CoveragePlan[]; savedProviders: SavedProvider[] }
SavedProvider = { id, planId?, providerSlug, providerName, profilePath, licenseSummary?, lines?, status, notes?, savedAt, updatedAt, city?, state? }
```

## Rules

- Guest-first localStorage; SSR-safe (empty on server)
- One **active** plan in Phase A UI (array retained for multi-plan later)
- Migrates legacy shortlist keys
- Research only — no quote / lead-gen CTAs

## Out of scope (later)

Multi-plan library, email/PDF report, wizard, SSO, tool snapshots

## Human test steps

1. Open `/my-insurance` signed out → guest HQ (plan form; empty shortlist if first visit).  
2. Set plan label + protect-focus chips → **Save plan on this device**.  
3. Open any `/providers/[slug]` → **Save** → toast “Saved to My Insurance” → **Open HQ**.  
4. Confirm provider listed with status **Shortlisted**.  
5. Hard refresh `/my-insurance` → plan + provider still present.  
6. Change status → **Done**; then remove → gone after refresh.  

**Default plan when saving with zero plans:** auto-creates `My coverage research` (`upsertSavedProvider` → `upsertPlan`).  

**Storage key:** `ith:my-insurance:v1`
