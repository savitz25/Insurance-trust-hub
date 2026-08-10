# ACA Marketplace content clusters

**Flagship tool:** `/tools/marketplace-plan-research`  
**Guide base:** `/guides/*`

## Phase 1 (shipped)

| URL | Primary intent |
|-----|----------------|
| `/guides/florida-aca-marketplace` | ACA Marketplace Florida (statewide) |
| `/guides/miami-dade-aca-marketplace` | ACA plans in Miami |
| `/guides/broward-aca-marketplace` | Marketplace insurance Broward County |
| `/guides/palm-beach-aca-marketplace` | Silver plan cost Palm Beach (educational framing) |

Index: `/guides`

## Template

Every guide: hero CTAs → overview → ZIP CTA → what tool shows → cost factors → trust/next steps → FAQ → related guides.

Required links: flagship, cost estimator, ACA subsidy, local hub, methodology, HealthCare.gov.

## Code

- `lib/guides/aca-marketplace-guides.ts` — content data  
- `components/guides/aca-marketplace-guide-view.tsx` — layout  
- `app/guides/[slug]/page.tsx` — SSG pages  

## Tier 2 next

Texas, Georgia, North Carolina, Pennsylvania, Ohio, Michigan (statewide + 1–2 metros each).
