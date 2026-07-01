# Insurance Trust Hub — Hub Architecture Blueprint

Mirrors [LenderTrustHub.com](https://www.lendertrusthub.com) structure adapted for insurance with **60% health / 40% multi-line** emphasis per hub.

## Site Architecture

| Section | Route | Purpose |
|---------|-------|---------|
| Homepage | `/` | ZIP hero search, How It Works (3 steps), hub grid, calculators CTA |
| Directories | `/directory` | Full agent search with filters |
| Health Hubs | `/hubs` | Hub browser + ZIP search |
| State Browser | `/hubs/[state]` | State-level MSA listing |
| MSA Hub | `/hubs/[state]/[slug]` | Full hub template (54 markets) |
| All Hubs | `/hubs/browse` | Complete 54-hub inventory |
| Calculators | `/calculators/*` | Premium, Medicare gap, ACA subsidy |
| Trust | `/about` | Independence, verification methodology |

## Hub URL Pattern

```
/hubs/[state-slug]/[city-msa-slug]

Examples:
/hubs/florida/miami-fort-lauderdale
/hubs/new-york/nyc-newark-jersey-city
/hubs/california/los-angeles
```

## Hub Page Template Sections

1. **Hero** — "Top Verified Insurance Agents in [MSA]" + ZIP re-search
2. **Local Market Snapshot** — population, enrollment, health density
3. **Health Insurance Specialists** — 4–6 ranked `AgentCard` components
4. **Full Directory** — 6–10 multi-line agencies
5. **Sidebar** — match form, "Why Local Matters", filter links

## Agent Card Fields

- Trust Score /100, Local Market Experience /100, Avg Response
- Star rating + review count
- Health focus badges (ACA, Medicare, Dental, Group)
- DOI license, NAIC verified, BBB rating
- CTAs: Get Free Health Quote, View Profile

## Data Files

- `lib/hubs/registry.ts` — 54 hub definitions
- `lib/hubs/agents.ts` — programmatic agent generation per hub
- `lib/hubs/agent-lookup.ts` — slug → provider for profile pages

## Top 15 Fully Fleshed Hubs (priority 1–15)

NYC, Los Angeles, Chicago, DFW, Houston, DC Metro, South Florida, Philadelphia, Atlanta, Phoenix, Boston, Bay Area, Inland Empire, Detroit, Seattle.

## Independence Language

> Independent directory. Not affiliated with any insurance carrier, agency, or agent. We analyze public records and real reviews — never sponsored.