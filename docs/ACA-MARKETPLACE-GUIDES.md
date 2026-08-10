# ACA Marketplace content clusters

**Flagship tool:** `/tools/marketplace-plan-research`  
**Guide base:** `/guides/*`

## Phase 1 — Florida (shipped)

| URL | Primary intent |
|-----|----------------|
| `/guides/florida-aca-marketplace` | ACA Marketplace Florida (statewide) |
| `/guides/miami-dade-aca-marketplace` | ACA plans in Miami |
| `/guides/broward-aca-marketplace` | Marketplace insurance Broward County |
| `/guides/palm-beach-aca-marketplace` | Silver plan cost Palm Beach (educational framing) |

## Tier 2A — Texas (shipped)

| URL | Primary intent |
|-----|----------------|
| `/guides/texas-aca-marketplace` | ACA Marketplace Texas (statewide) |
| `/guides/houston-aca-marketplace` | ACA plans in Houston |
| `/guides/dallas-aca-marketplace` | Marketplace insurance Dallas |

Index: `/guides` (grouped by state)

## Template

Every guide: hero CTAs → overview → ZIP CTA → what tool shows → cost factors → trust/next steps → FAQ → related guides.

Required links: flagship, cost estimator, ACA subsidy, local hub, methodology, HealthCare.gov.

## Code

- `lib/guides/aca-marketplace-guides.ts` — content data  
- `components/guides/aca-marketplace-guide-view.tsx` — layout  
- `app/guides/[slug]/page.tsx` — SSG pages  

## Tier 2 next

Georgia + Atlanta, then North Carolina, Pennsylvania, Ohio, Michigan.
