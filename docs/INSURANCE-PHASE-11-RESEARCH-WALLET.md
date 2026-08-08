# Insurance Trust Hub — Phase 11: My Insurance Cross-Device Research Wallet

**Date:** 2026-08-09

## Product

Persistent **research wallet** for coverage decisions (not a claims portal, not lead CRM).

| Object | Storage |
|--------|---------|
| Saved plans (X-Ray path + snapshot fields) | Local + optional cloud |
| Doctors / facilities (NPI) | Local + optional cloud |
| Prescriptions (RxCUI) | Local + optional cloud |
| Market ZIP / year / scenario / county | preferences |
| Notes | optional free text ≤2k |

## Auth / restore

1. Explore anonymously (no login required)
2. **Save to My Insurance** (explicit)
3. Guest → `localStorage` key `ith:research-wallet:v1`
4. Optional magic link / Google (existing My Insurance auth) → sync JSON to `insurance_research_wallets`
5. Other device: sign in → merge cloud ∪ local → restore into Explorer

## Entry points

- Plan Explorer: save session + per-plan save
- Plan X-Ray: save plan
- My Insurance home: wallet panel, continue to Explorer, clear, sync

Restore URL: `/tools/aca-plan-explorer?restore=wallet&zip=…&year=…`

## Privacy

Visible copy: personal research continuity; not sold as leads; delete anytime; agency contact separate.

## Cloud schema

`supabase/migrations/20260809120000_research_wallet.sql`  
→ `insurance_research_wallets (user_id PK, payload JSONB, updated_at)`

Apply migration on Insurance Supabase project for cross-device sync. Without it, guest/local still works.

## Measurement

`wallet_save_plan`, `wallet_save_doctor`, `wallet_save_drug`, `wallet_restore`, `wallet_magic_link_requested`, `wallet_opened`, `continue_from_wallet_to_explorer`, `wallet_item_deleted`

## Modules

| Path | Role |
|------|------|
| `lib/my-insurance/research-wallet.ts` | Local wallet API |
| `components/my-insurance/research-wallet-panel.tsx` | HQ UI |
| `components/my-insurance/save-research-wallet-button.tsx` | Save CTA |
| `actions/my-insurance.ts` | Cloud get/save/delete |

## Next hooks

- Medicare wallet objects
- Carrier intelligence pins
- Explicit export/share (opt-in only)
