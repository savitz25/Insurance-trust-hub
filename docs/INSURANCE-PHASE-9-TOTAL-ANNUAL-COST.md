# Insurance Trust Hub — Phase 9: Total Annual Cost Engine

**Date:** 2026-08-08  
**Route:** `/tools/aca-plan-explorer` (`#yearly-cost`)  
**Module:** `lib/marketplace/annual-cost.ts`

## Product

Compare Marketplace plans by **estimated yearly cost**, not monthly premium alone.

```text
Plan Explorer results
  → optional doctors / prescriptions (Phase 8)
  → choose care-usage scenario (Low / Moderate / Higher / Custom)
  → re-search CMS with household utilization
  → plan cards show estimated annual cost when CMS OOPC exists
  → sort / compare / detail breakdown
```

**Insight productized:** The cheapest premium is often not the cheapest plan.

## Scenario model

| UI | CMS utilization | Notes |
|----|-----------------|--------|
| Off | (none) | Premiums/facts only |
| Low use | `Low` | Few visits |
| Moderate use | `Medium` | Typical care |
| Higher use | `High` | Regular / higher care |
| Custom | mapped Low/Medium/High | Visit-style inputs → score → CMS enum |

Custom does **not** invent dollar OOPC; it only selects CMS utilization for the re-search.

## Cost formula (when available)

```text
estimated total annual =
  (monthly premium after educational credit context × 12)
  + CMS plan oopc
```

or CMS `total_costs` when the API returns a non-negative total.

### Fail closed

- CMS `oopc` missing or `-1` → **Estimate unavailable** (never $0 fake total)
- Scenario off → no yearly-cost claim
- Premium missing + OOPC present → unavailable total (partial)

## UI

- Scenario selector + “Compare by estimated yearly cost”
- Sort: **Estimated yearly cost**
- Cards: Est. yearly cost, Lowest premium / Lowest est. yearly cost badges
- Compare: yearly cost column + doctor/Rx
- Detail: premium + CMS OOPC + total, method, assumptions, limitations

## Data

- `POST /api/marketplace/plans` accepts `utilization: Low|Medium|High`
- Plan cards store `cmsOopc`, `cmsTotalCosts`, `utilizationApplied`
- Provenance on estimates: method, scenario, plan year, source, retrievedAt

## Analytics

`scenario_selected`, `custom_scenario_used`, `sort_by_yearly_cost`, `plan_detail_with_cost`, `compare_with_yearly_cost`

## Trust copy

> This estimate helps compare plans under a scenario. It is not a promise of your real annual cost.

Research only; confirm on HealthCare.gov; no paid placements.

## QA

- [x] Works with scenario Off  
- [x] Scenarios re-request CMS with utilization  
- [x] Unavailable ≠ $0  
- [x] Lowest premium vs lowest yearly labels from filtered set  
- [x] Doctor/Rx still visible  
- [x] No lead gate / no agency dependency  

## Later hooks

- Deeper Plan X-Ray (benefit-line cost sharing)
- County ACA intelligence aggregates
- Drug-specific Rx cost when formulary pricing exists
