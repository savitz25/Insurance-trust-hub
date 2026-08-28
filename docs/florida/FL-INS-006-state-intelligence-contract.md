# FL-INS-006 — Florida state intelligence contract

Snapshot version: `insurance-fl-state-intel-v1`  
Library: `lib/national/fl-state-intel.ts`  
Generator: `scripts/national/fl-ins-006.py` (read-only; no graph writes)  
Payload: `data/reports/fl-ins-006-state-snapshot.json`

Supports eventual `/florida` and module-specific profile enrichment. **No UI in this task.** Route not created. No sitemap. Noindex not needed because the page does not exist. No county pages. No rankings. No Trust Scores.

`generatedAt` is the production assembly timestamp. `asOf` is `production-live`. Headline counts come from production, never hard-coded in UI.

## Semantic boundaries

ENTITY ≠ CREDENTIAL ≠ LOA ≠ APPOINTMENT ≠ QUALITY.  
APPOINTER IDENTITY ≠ LEGAL INSURER. CMS ≠ state license. Citizens ≠ DFS license.  
MIR activity ≠ quality. PIF ≠ quality. Premium volume ≠ consumer price.  
Surplus eligibility ≠ admitted. CRN ≠ finding. Exam ≠ misconduct. Liquidation ≠ conduct violation.  
NFIP listing ≠ certification. Missing data ≠ zero/clean.

Do not infer county insurer activity from agency/person/appointment/credential/OFR addresses. Current MIR ingest is statewide.

## Modules

Overview · Agency credentials · Producer credentials · Appointments · Legal insurer/OIR · Residential market · PIF · Written premium · Exposure · Surplus lines · CMS · Citizens residual · CHOICES · IRFS · Flood/NFIP · Regulatory history · Methodology · Source clocks · Limitations.

## Publication

Do not mass-publish agencies, people, or legal insurers. People remain unpublished. Legal-insurer pages remain 0. Existing provider population is not expanded. Unresolved appointer identity stays unresolved (`FL APPOINTER_RESOLVES_TO = 0`).
