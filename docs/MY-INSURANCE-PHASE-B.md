# My Insurance Phase B — Shortlist discipline + save surfaces

**Production:** Insurance-trust-hub only.

## Rules

| Bucket | Cap |
|--------|-----|
| `shortlisted` | **Max 3** per active plan |
| `researching` | Soft guidance at 10; not a hard block |
| `reached_out` / `done` | Unlimited (history) |

4th shortlist attempt → replace modal (replace one, demote oldest, or save as researching). Never silent drop.

## Defaults

| Surface | Default status on first save |
|---------|------------------------------|
| Directory card **Save** | `researching` |
| Profile **Save** | `shortlisted` (subject to cap) |

## Files

- `lib/my-insurance/shortlist-rules.ts`
- `lib/my-insurance/storage.ts` — `upsertSavedProvider` result + shortlist policies
- `components/my-insurance/shortlist-full-panel.tsx`
- `components/my-insurance/save-provider-button.tsx` — Save / In My Insurance + Manage
- `components/my-insurance/guest-insurance-hq.tsx` — sectioned HQ
- `components/provider-card.tsx` — directory Save

## Human tests

1. Signed out → shortlist 3 from profiles  
2. 4th shortlist → modal; still max 3 shortlisted  
3. Directory Save → Researching  
4. Profile of saved → Manage status / remove  
5. HQ sections + hard refresh  

Storage remains `ith:my-insurance:v1`.

**Compare tray (separate):** `ith-my-insurance-compare-tray-v1` — see `docs/MY-INSURANCE-COMPARE-FIX.md`.
