# ASK-SEARCH-INSURANCE-002 — Ask Handoff Consumer

**Status:** Implemented on InsuranceTrustHub (not wired into Ask production deploy)

Receives structured AskTrustHub Universal Search handoffs and preloads the
existing Insurance directory / carriers experience. Consumers do not retype the
search.

## Entry

| Route | Role |
|-------|------|
| `/from-ask` | noindex receiver → redirects to directory / carriers / unsupported |
| `/from-ask/unsupported` | Medicare / ambiguous / invalid fail-closed empty |
| `/directory?src=ask&…` | Preloaded agency/brokerage results |
| `/carriers?src=ask&…` | Carrier hub; geo Ask context → honest zero |
| `/providers/{slug}?src=ask&…` | Profile + “Back to Results” |

## Allowlist

`src`, `journey`, `state`, `county`, `intent`, `entity`, `category`, `city`, `zip`, `sid`

`src` must be `ask`. Forbidden: `query`, `email`, `phone`, `name`, `next`, `redirect`, etc.

## Entity behavior

| Entity | Destination |
|--------|-------------|
| `insurance_brokerage` / `insurance_agency` / `insurance_agent` | `/directory` |
| `insurance_carrier` | `/carriers` (no safe geo → empty when state/city/zip present) |
| `medicare_agent` | unsupported empty (never health brokerages) |
| unknown / `insurance_company` | unsupported empty (no default) |

## Legitimacy

Public `getProviders` applies `evaluateDiscoveryLegitimacy` so incidental
license holders (e.g. AutoNation Chevrolet Coral Gables / AUTOMOBILE WARRANTY)
cannot reappear via Ask handoff.

## Geography

- `state` → licensed/service directory filter (`states_licensed`)
- `city` → exact physical city match (post-filter); license ≠ office
- `zip` → existing ZIP→geo resolver

## Modules

`lib/ask-handoff/*` — parse, directory href, back labels, city match.
