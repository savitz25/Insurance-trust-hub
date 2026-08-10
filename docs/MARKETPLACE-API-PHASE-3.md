# Marketplace API — Phase 3 (My Insurance saves)

**Base:** Phase 1 `bd43ba6` · Phase 2 `43c69a7`  
**Goal:** Persist planner research in My Insurance (retention, not enrollment).

## Schema

Migration: `supabase/migrations/20260810200000_saved_calculator_marketplace_meta.sql`

Adds optional columns on `saved_calculator_results`:

| Column | Purpose |
|--------|---------|
| `zip` | List filter / display |
| `state` | List display |
| `county` | List display |
| `used_live_marketplace` | Live vs educational badge |
| `plan_year` | Vintage |
| `updated_at` | Touch time |

Full research lives in `snapshot` JSONB. Insert falls back to legacy columns if migration not applied yet.

## Save payload shape (`marketplaceResearch` v1)

```ts
{
  version: 1,
  toolKey: 'cost_estimator' | 'aca_subsidy',
  toolLabel: string,
  createdAt: ISO string,
  zip, state, county, marketLabel,
  household: { ages, householdSize, tobacco? },
  income: { annual, fplPercentLabel, fplRatio },
  assistanceSummary,
  usedLiveMarketplace: boolean,
  planYear,
  marketSnapshot: { planCount, issuerCount, premiumLow/High, deductibleLow/High } | null,
  researchPaths: [{ id, label, metal, premiums, deductible, moop, planName?, issuerName? }],
  recommendedPathId,
  costSummary,
  provenance: { honesty[], sourceSystem, retrievedAt, fallbackNotice }
}
```

## Email

Best-effort via existing Resend path after cloud save:

- Subject: `Your InsuranceTrustHub research summary`
- Market / plan count when live
- Link to `/my-insurance`
- HealthCare.gov reminder
- No sales pitch

If `RESEND_API_KEY` missing, save still succeeds.

## Files

| Path | Role |
|------|------|
| `lib/marketplace/research-snapshot.ts` | Build/extract snapshot |
| `components/my-insurance/save-calculator-button.tsx` | Auth-gated cloud save |
| `actions/my-insurance.ts` | Denormalized insert + email fields |
| `lib/my-insurance/emails.ts` | Research summary email |
| `components/my-insurance/my-insurance-dashboard.tsx` | Saved plan research list |
| Cost / ACA planner results | Rich snapshot CTA |

## Deferred

- Drug/doctor search UI  
- SEO flagship page (Phase 4)  
- Auto-save without user intent  

## Ops

Apply migration on Insurance Supabase:

```bash
# via Supabase CLI / dashboard SQL for Insurance project
20260810200000_saved_calculator_marketplace_meta.sql
```
