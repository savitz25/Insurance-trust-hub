# Insurance Cost & Coverage Planner (Phase 3B-1)

**URL:** `/tools/cost-estimator`  
**Product name:** Insurance Cost & Coverage Planner  
**Status:** Shipped (educational ranges; Marketplace API deferred to 3B-2)

## What it does

Multi-step wizard that estimates **total annual cost** for ACA / Marketplace-style health coverage:

- Premium ranges (gross and after educational PTC context)
- Deductible / max OOP bands by metal-style path
- Expected out-of-pocket from utilization (not conditions)
- Three paths: lowest premium · balanced · lower OOP

## What powers each estimate

| Output | Data / method | Approximate? |
|--------|----------------|--------------|
| Location | Client-side ZIP → state / curated county map (`lib/insurance/tools/zip-resolve.ts`) | County resolution partial outside curated ZIPs |
| Unsubsidized premium | State-adjusted educational baseline × simplified ACA age curve × metal factors × optional tobacco load (`aca-cost-planner.ts`) | **Yes** — not live plan quotes |
| Metal paths | Bronze / Silver / Gold relative factors (not named carriers) | **Yes** |
| Subsidy context | Household income vs 2025 HHS FPL; enhanced PTC contribution % table (educational) | **Yes** — not a determination |
| CSR note | Silver path when FPL suggests 100–250% band | **Yes** |
| Expected OOP | Utilization level + Rx + major-care flags × MOOP band | **Yes** |
| Total annual cost | Net premium + expected OOP | **Yes** |

## Explicit non-effects

- Pre-existing conditions are **never** used to raise premiums (ACA guaranteed issue).
- Health-use inputs affect **OOP / fit only**.
- No lead capture, no phone/email gate, no stored health/income inputs.

## Provenance labels (shown in UI)

- Plan year context: 2026  
- FPL: HHS 2025 contiguous guidelines  
- Last reviewed: 2026-07  
- Disclaimer: verify on HealthCare.gov / state marketplace  

## Phase roadmap

- **3B-1 (this ship):** Wizard + total-cost scenarios + internal CMS tool links  
- **3B-2:** CMS Marketplace API landscape stats (cached, user-triggered)  
- **3B-3:** Doctor network / drug coverage / Complaint Index deeper signals  

## Related tools (linked from results)

- `/data/plan-complaint-index`
- `/data/counties` (+ FL tri-county slugs when ZIP resolves)
- `/tools/medicare-provider-lookup`
- `/tools/medicare-plan-finder`
- `/hubs/aca`, `/hubs/south-florida`
