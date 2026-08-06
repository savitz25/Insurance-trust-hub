# Vercel domain ownership (Ask Trust Hub network)

**Hard rule:** Production hosts are **not** the same Git repo or Vercel project.  
A merge to Move monorepo does **not** update `insurancetrusthub.com`.

## Who owns which domain

| Public domain | Vercel project (typical name) | Production Git repo | Branch |
|---------------|-------------------------------|---------------------|--------|
| `www.movetrusthub.com` | **Move-trust-Hub** | `savitz25/Move-trust-Hub` | `main` |
| `www.insurancetrusthub.com` | **Insurance-trust-hub** | `savitz25/Insurance-trust-hub` | `main` |
| `www.lendertrusthub.com` | **Lender-Trust-Hub** | `savitz25/Lender-Trust-Hub` | `main` |
| `www.asktrusthub.com` | **Conumers-Trust-Hub** (Ask) | Ask / Conumers-Trust-Hub | `main` |

## Setup (not multi-domain on one project)

- **Separate Vercel projects**, each linked to its own GitHub repo.
- Insurance apex is a **standalone Next app** in `Insurance-trust-hub` (routes at `/directory`, `/calculators`, …).
- Move monorepo may still contain `app/insurance/*` for parity / rewrite experiments; that code deploys with **Move** only (`movetrusthub.com`), not Insurance production.

## Shipping Insurance UI (e.g. primary nav)

1. Implement and push to **`Insurance-trust-hub` `main`**.
2. Confirm Vercel **Insurance** project deploys that commit.
3. Smoke: https://www.insurancetrusthub.com/ — desktop header should show  
   Directory · Calculators · Guides · Methodology · Trust & Transparency · My Insurance · Contact · Compare agencies.

Optional: mirror the same change under Move monorepo `app/insurance` if Move hosts `/insurance/*` previews — never as a substitute for step 1.

## Verify Git connection

Vercel → project → Settings → Git:

- Insurance project → `Insurance-trust-hub`, production branch `main`
- Move project → `Move-trust-Hub`, production branch `main`

Domains must be assigned on the **matching** project (Insurance domains must not point only at Move).
