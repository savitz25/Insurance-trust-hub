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
