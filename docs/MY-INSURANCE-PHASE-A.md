# My Insurance Phase A — Guest-first HQ + data model

**Production:** `www.insurancetrusthub.com` ← **Insurance-trust-hub** only.

## Shipped

| Piece | Location |
|-------|----------|
| Types | `lib/my-insurance/plan-types.ts` — `CoveragePlan`, `SavedProvider` |
| Storage | `lib/my-insurance/storage.ts` — localStorage `ith-my-insurance-store-v1` |
| HQ UI | `components/my-insurance/guest-insurance-hq.tsx` (guest) + existing signed-in dashboard |
| Save | `components/my-insurance/save-provider-button.tsx` — guest save without login |

## Model (chapter vocabulary)

- **Plan** = coverage research plan (`CoveragePlan`)
- **Saved providers** = shortlist items (`SavedProvider`)
- **Status** = `researching` \| `shortlisted` \| `reached_out` \| `done`

## Guest rules

- Works with no login
- Migrates legacy `ith-my-insurance-saved-providers-v1` into a default plan
- Optional sign-in still available for cloud sync (existing auth)

## Out of scope (later phases)

- Multi-plan library UI
- Email reports / guided wizard
- Cross-hub journey object / SSO

## Product rules

Research only · no request-quotes CTAs · no “agents will call you.”
