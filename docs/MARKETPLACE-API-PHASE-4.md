# Marketplace API — Phase 4 (SEO flagship + distribution)

**Base:** Phase 1 `bd43ba6` · Phase 2 `43c69a7` · Phase 3 `c5d97fb`  
**Canonical public URL:** `/tools/marketplace-plan-research`

## Goal

One discoverable, indexable flagship for local ACA Marketplace landscape research — educational only, CMS-powered when available, HealthCare.gov handoff.

## Flagship page

| Item | Value |
|------|--------|
| Path | `/tools/marketplace-plan-research` |
| H1 | Research Marketplace plans near you |
| Title | Research Marketplace Plans Near You — Local ACA Landscape \| Insurance Trust Hub |
| Description | Independent local ACA Marketplace plan research by ZIP: plan counts, issuer landscape, lower-premium vs more protective paths, and assistance context. Educational only — verify and enroll on HealthCare.gov. No lead selling. |

### Sections

1. Hero + trust chips  
2. Interactive ZIP module (`FlagshipPlanResearch`) — snapshot, narrative, path cards, Save to My Insurance, HealthCare.gov CTA  
3. How this helps  
4. Methodology & provenance (`#methodology`)  
5. Related tools  
6. Soft agent path (directory / ACA hub — no lead gate)  
7. FAQ (+ FAQPage schema matching visible FAQs)

## Internal links

| From | Label style |
|------|-------------|
| `/tools` | Featured flagship + intent card |
| `/tools/cost-estimator` | Research Marketplace plans near you |
| `/calculators/aca-subsidy` | Local plan landscape |
| `/marketplace` | Research Marketplace plans near you |
| `/methodology` | Local plan landscape |
| Sitemap | Priority ~0.95 |

Honest labels only (no “get quotes” / “enroll now”).

## Metadata / schema

- `buildMetadata` → self-canonical, OG/Twitter ITH branding  
- `buildResearchPageGraph` → WebPage + BreadcrumbList + WebApplication + FAQPage  
- Index policy: yes (tool landing only; no query variants)

## Methodology (visible)

- CMS Marketplace API when key configured server-side  
- Educational subsidy/cost modeling may still apply  
- Not eligibility determination  
- Not complete inventory guarantee  
- Final availability/pricing/eligibility: HealthCare.gov  

## Deferred

- Drug/doctor UI  
- Enrollment / web-broker  
- Redesigning all planners  

## Files

| Path | Role |
|------|------|
| `app/tools/marketplace-plan-research/page.tsx` | Flagship page |
| `components/marketplace/flagship-plan-research.tsx` | ZIP research module |
| `app/tools/page.tsx` | Featured distribution |
| `app/sitemap.ts` | Index URL |
| `lib/seo/research-seo.ts` | Index map + FAQ graph support |
| Planner / marketplace / methodology pages | Contextual links |

## Recommended next backlog

1. Content clusters (state/metro guides) linking into the flagship  
2. Live drug/doctor match-quality audit before any UI  
3. County ACA pages: soft contextual link to ZIP research when ZIP known  
