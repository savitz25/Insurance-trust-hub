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

## Cross-contamination fix (2026-07-28)

**Symptom:** `www.insurancetrusthub.com/local-movers/...` served Move chrome when domains pointed at the monorepo project.

**Fixes shipped:**

| Repo | Change |
|------|--------|
| **Insurance-trust-hub** | Middleware 301s Move-only paths (`/local-movers`, `/companies`, `/auto-transport`, `/moving-to`, `/lender`, …) to the correct network apex |
| **Move-trust-Hub** | `lib/hub/domains.ts` + middleware: on insurance host, Move-only paths **301 → movetrusthub.com** (never rewrite into `/insurance/[[...legacy]]`) |

**Ops rule:** Domain aliases for `insurancetrusthub.com` / `www` must stay on Vercel project **`insurance-trust-hub`**, not `move-trust-hub`.

## MoveTrustHub cleanup (optional)

1. After any monorepo deploy, confirm ITH domains still alias to **insurance-trust-hub**.
2. Monorepo may keep `/insurance/*` for multi-hub; public Move host redirects `/insurance/*` → ITH apex when configured.
3. Keep `movetrusthub.com` only on project `move-trust-hub`.
