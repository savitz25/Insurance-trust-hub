# FL-INS-006 — profile enrichment contract

Evaluate **existing** public providers only. Do not expand the public population.

## Classes (a profile may be ready for one module and not another)

- `READY_FOR_FL_CREDENTIAL_MODULE` — CONFIRMED provider→agency NPN bridge **and** a Florida credential row (14,834)  
- `READY_FOR_FL_APPOINTMENT_MODULE` — CONFIRMED bridge **and** ≥1 Florida `appointed_by` row (613)  
- `READY_FOR_FL_MARKET_MODULE` — entity kind `legal_insurer` with exact-NAIC MIR rows (0; public legal-insurer pages are 0)  
- `READY_FOR_CMS_MODULE` — CONFIRMED bridge and CMS observation on that **agency** entity (0; CMS attaches to person NPN, not agency)  
- `READY_FOR_SURPLUS_MODULE` — legal insurer with CONFIRMED surplus-lines eligibility (0 on public agency profiles)  
- `READY_FOR_FL_REGULATORY_MODULE` — CONFIRMED attach of Florida regulatory evidence (0; 12 liquidations unattached INTERNAL_ONLY)  
- NFIP deterministic (0; public cards have no NPN)  
- `INTERNAL_ONLY` / `REVIEW_REQUIRED` / `NOT_READY`

Unresolved evidence is never counted ready. No name matching. No graph traversal across unresolved appointer bridges.

## Forbidden profile claims

licensed throughout Florida (from location) · authorized in county (from county appointments) · appointed by a named legal insurer without `APPOINTER_RESOLVES_TO` · no complaints / clean record from missing data · NFIP certified · admitted from FSLSO eligibility
