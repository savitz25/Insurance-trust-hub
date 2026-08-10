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

## Tier 2B — Georgia (shipped)

| URL | Primary intent |
|-----|----------------|
| `/guides/georgia-aca-marketplace` | ACA Marketplace Georgia (statewide) |
| `/guides/atlanta-aca-marketplace` | ACA plans in Atlanta |

## Tier 2C — North Carolina (shipped)

| URL | Primary intent |
|-----|----------------|
| `/guides/north-carolina-aca-marketplace` | ACA Marketplace North Carolina (statewide) |
| `/guides/charlotte-aca-marketplace` | ACA plans in Charlotte |
| `/guides/research-triangle-aca-marketplace` | Marketplace insurance Raleigh (Raleigh–Durham–Chapel Hill) |

## Tier 2D — Pennsylvania (shipped)

| URL | Primary intent |
|-----|----------------|
| `/guides/pennsylvania-aca-marketplace` | ACA Marketplace Pennsylvania (statewide) |
| `/guides/philadelphia-aca-marketplace` | ACA plans in Philadelphia |
| `/guides/pittsburgh-aca-marketplace` | Marketplace insurance Pittsburgh |

## Northeast — New Jersey by region (shipped)

| URL | Primary intent |
|-----|----------------|
| `/guides/new-jersey-aca-marketplace` | ACA Marketplace New Jersey (statewide) |
| `/guides/south-jersey-aca-marketplace` | ACA plans in South Jersey |
| `/guides/central-jersey-aca-marketplace` | Marketplace insurance Central Jersey |
| `/guides/north-jersey-aca-marketplace` | ACA plans in North Jersey |

## Northeast — New York metro (shipped)

| URL | Primary intent |
|-----|----------------|
| `/guides/new-york-aca-marketplace` | ACA Marketplace New York (statewide) |
| `/guides/nyc-aca-marketplace` | ACA plans in NYC |
| `/guides/long-island-aca-marketplace` | Marketplace insurance Long Island |
| `/guides/westchester-aca-marketplace` | ACA plans in Westchester |

**Official pathway note:** New York is a state-based Marketplace (NY State of Health). Guides set `enrollmentLinks` to NY State of Health + HealthCare.gov; do not frame NY as pure HealthCare.gov-only.

## Northeast — Connecticut (shipped)

| URL | Primary intent |
|-----|----------------|
| `/guides/connecticut-aca-marketplace` | ACA Marketplace Connecticut (statewide) |
| `/guides/fairfield-county-aca-marketplace` | ACA plans in Fairfield County |
| `/guides/hartford-aca-marketplace` | Marketplace insurance Hartford |

**Official pathway note:** Connecticut is a state-based Marketplace (Access Health CT). Guides set `enrollmentLinks` to Access Health CT + HealthCare.gov; do not frame CT as pure HealthCare.gov-only.

Index: `/guides` (grouped by state)

## Template

Every guide: hero CTAs → overview → ZIP CTA → what tool shows → cost factors → trust/next steps → FAQ → related guides.

Required links: flagship, cost estimator, ACA subsidy, local hub, methodology, official enrollment (HealthCare.gov and/or state Marketplace).

## Code

- `lib/guides/aca-marketplace-guides.ts` — content data  
- `components/guides/aca-marketplace-guide-view.tsx` — layout  
- `app/guides/[slug]/page.tsx` — SSG pages  

## Tier 2 next

Northeast core complete (NJ / NY / CT). Next: pause for compounding, or Midwest Tier 2 (Ohio + Columbus / Cleveland; Michigan optional).
