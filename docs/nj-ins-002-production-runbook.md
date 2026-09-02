# NJ-INS-002 production runbook

Internal-only New Jersey IHC/SEH, Get Covered NJ, residual-market, CRIB Plan Risk, and SERFF evidence for InsuranceTrustHub.

## Safety

- Repository: `savitz25/Insurance-trust-hub`
- Branch: `nj-ins-002-ihc-seh-residual`
- Do not run Vercel commands or change domains.
- Do not create `/new-jersey`, rankings, Trust Scores, person profiles, or employer profiles.
- Do not weaken the bail-bond publication firewall.
- Do not copy credentials from other repositories.
- Do not bypass CRIB login or SERFF access controls.
- Do not commit PlanRisk DAT, SERFF corpora, or large PDFs.

## Commands

```bash
python scripts/nj-ins-002-discover.py
python scripts/nj-ins-002.py inspect
python scripts/nj-ins-002.py dry-run
python scripts/nj-ins-002.py execute
python scripts/nj-ins-002.py verify
python scripts/nj-ins-002-tests.py
```

## Semantics

IHC ≠ SEH. Marketplace participation ≠ endorsement. Base rate ≠ personalized premium.
Average rate change ≠ quality. Residual program ≠ voluntary insurer. NJIUA ≠ legal carrier.
PAIP ≠ CAIP. SAIP ≠ PAIP. Plan Risk ≠ unsafe employer. Experience mod ≠ Trust Score.
Loss ratio ≠ ranking. FILED ≠ APPROVED. HIOS ≠ NAIC. CRIB company number ≠ NAIC.

## CRIB

Access: `PUBLIC_WITH_TERMS`. PlanRisk DAT is downloadable without login. NJCRIB Terms of Use restrict redistribution and using website content to supplement a database. Acquire one current file for internal profiling only. Do not commit the raw file. Do not publish employers.

## SERFF

Access: `SOURCE_ACCESS_BLOCKED` (HTTP 403 on `https://filingaccess.serff.com/sfa/home/NJ`). No CAPTCHA bypass, private API, or unlimited harvest.

## Database

Apply `supabase/migrations/20260902180000_nj_ins_002_market_intelligence.sql` only against the InsuranceTrustHub database. If no authorized session exists, merge dormant code and leave execute pending. Reconciliation: `docs/sql/nj-ins-002-reconciliation.sql`.
