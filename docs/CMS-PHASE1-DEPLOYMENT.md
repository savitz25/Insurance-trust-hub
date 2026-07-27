# CMS Phase 1 — InsuranceTrustHub deployment

## Canonical targets

| Layer | Target |
|-------|--------|
| GitHub | https://github.com/savitz25/Insurance-trust-hub |
| Local path | `C:\Users\makei\insurance-trust-hub` |
| Vercel project | `insurance-trust-hub` (`prj_ARBlfWYNhpJWBtaPO4vUJlraa5BK`) |
| Production domains | `www.insurancetrusthub.com`, `insurancetrusthub.com` |

**Do not** push InsuranceTrustHub-only work to `Move-trust-Hub` / project `move-trust-hub`.

## Phase 1 production URLs

1. **Plan Complaint Index**  
   https://www.insurancetrusthub.com/data/plan-complaint-index

2. **Government Verification Panel** (on any provider profile)  
   https://www.insurancetrusthub.com/providers/{slug}  
   Example: https://www.insurancetrusthub.com/providers/guardian-insurance-group-san-francisco-ca

3. **Government Standing in Trust Score**  
   Same provider page → sidebar **Trust metrics** breakdown

## Commit

- `8e18b01` — `feat(cms): Phase 1 CMS data integration on InsuranceTrustHub`

## Domain move (2026-07-27)

Previously both `insurancetrusthub.com` and `www.insurancetrusthub.com` were aliased to **move-trust-hub**.

They were reassigned to the latest **insurance-trust-hub** production deployment so the apex site serves this repo (not the MTH monorepo).

## MoveTrustHub cleanup (optional, non-blocking)

MTH monorepo still contains a port of CMS under `/insurance/...` from commit `2678993b`. That is fine for the multi-hub site if you keep insurance content there.

Recommended cleanup on MTH (when convenient):

1. Leave CMS code if `www.movetrusthub.com/insurance` should stay feature-parity.
2. Or strip insurance CMS UI later if insurance is fully apex-only on ITH.
3. Ensure future deploys from `move-trust-hub` **do not** re-add `insurancetrusthub.com` domain aliases.
4. Keep `movetrusthub.com` only on project `move-trust-hub`.
