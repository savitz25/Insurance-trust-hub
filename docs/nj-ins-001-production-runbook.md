# NJ-INS-001 production runbook

Internal-only New Jersey DOBI insurance evidence for InsuranceTrustHub.

## Safety

- Repository: `savitz25/Insurance-trust-hub`
- Branch: `nj-ins-001-dobi-evidence`
- Do not run Vercel commands or change domains.
- Do not create `/new-jersey`, rankings, Trust Scores, or complaint leaderboards.
- Do not weaken the bail-bond publication firewall.
- Do not copy credentials from other repositories.

## Commands

```bash
python scripts/nj-ins-001-discover.py
python scripts/nj-ins-001.py inspect --skip-pdfs
python scripts/nj-ins-001.py download
python scripts/nj-ins-001.py dry-run --skip-pdfs
python scripts/nj-ins-001.py execute --skip-pdfs
python scripts/nj-ins-001.py verify --skip-pdfs
python scripts/nj-ins-001-tests.py
```

## Semantics

License ≠ appointment. Complaint ≠ violation. Valid complaint ≠ all complaints.
Market-conduct exam ≠ enforcement. Financial exam ≠ market-conduct exam.
Group ≠ legal NAIC entity. Producer ≠ insurer. Individuals remain internal-only.

## Database

Apply `supabase/migrations/20260902140000_nj_ins_001_regulatory_ledger.sql` only against the InsuranceTrustHub database. If no authorized session exists, merge dormant code and leave execute pending. Reconciliation: `docs/sql/nj-ins-001-reconciliation.sql`.
