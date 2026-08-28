# FL-INS-004 — Examination semantics

## Two families

| Family | Source pages | Meaning |
|--------|----------------|---------|
| `MARKET_CONDUCT_EXAM` | OIR Property & Casualty Market Regulation; Life & Health Market Regulation | Review of business practices / claims handling / statutory market conduct |
| `FINANCIAL_EXAM` | OIR Property & Casualty Financial Oversight (and Life & Health financial oversight when the listing is live) | Statutory financial-condition examination |

They are never stored as each other. A market-conduct report is not a financial exam. A financial exam is not a market-conduct finding.

## What an exam is not

- Exam **existence** is not misconduct.
- Exam **findings** are not an automatic sanction, license action, or final order.
- A later consent order arising from an exam is a **separate** `CONSENT_ORDER` / `FINAL_ORDER` record.
- Premium-finance and other non-insurer examinees are not forced onto `legal_insurer`.

## Identity

Public HTML listings give a document title (usually a company name and date) and a PDF URL. They do **not** expose NAIC or Florida Company Code as listing columns.

Some PDFs internally print a Florida Company Code or NAIC (example: Tepco Premium Finance amended market-conduct report, Florida Company Code 07797 — a premium-finance company, not a legal insurer). This task does not scrape PDF bodies for identifiers and does not name-match titles to the spine.

Until an official machine-readable catalog carries NAIC / Florida Company Code, exam rows remain unattached and are **not ingested**.

## Finality of the report document

A published “final report of examination” is a completed exam report. That is not a final enforcement order and not a misconduct label. `is_final` on an exam row, if later stored, means the report was issued, not that the company was sanctioned.

## Mixed listings

The P&C and L&H Market Regulation pages mix examination reports and consent orders in one HTML table. Classification uses the document title/URL (`Consent Order`, `-CO`, `Final Order`, `final report`). Consent orders are counted in the **order** census, not the market-exam census.
