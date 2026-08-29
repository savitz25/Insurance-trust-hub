# INS-INSURER-004 — PDF-native NAIC CoCode extraction

Mention ≠ subject. **Wave 1 = 0.** No `/insurers`.

## STATUS

**COMPLETE WITH BLOCKERS**

Native PDF text extraction works. California financial PDFs are readable. Exact examination-subject CoCodes were proven for **one consolidated Farmers report (7 legal insurers)**. 118/129 unique PDFs have **no labeled or table CoCode** (NAME_ONLY). Affiliate CoCodes in group tables were **not** attached. Florida OIR sample PDFs timed out from this environment (http/https host). TDI complaints remain INTERNAL_ONLY. Identity-only pages still prohibited.

## SAMPLE VALIDATION (CA)

| Report | Subject (cover) | Labeled/table CoCodes | Examined | Mentions excluded | Class |
|---|---|---|---|---|---|
| CA Automobile 2021 | named on cover | none | — | — | NAME_ONLY |
| Allianz Re America 2023 | (weak cover parse) | none | — | — | NAME_ONLY |
| CSAA Exchange 2023 | CSAA INSURANCE EXCHANGE | none | — | — | NAME_ONLY |
| Anchor General 2022 | ANCHOR GENERAL | none | — | — | NAME_ONLY |
| Blue Shield Life 2024 | split cover lines | none | — | — | AMBIGUOUS |
| AMT Home Protection 2024 | named | none | — | — | NAME_ONLY |
| Aspire General 2023 | named | none | — | — | NAME_ONLY |
| 21st Century shared PDF | Insurance Co + Casualty Co | 10245, 40169, 25321, 34339 (Farmers-group names, not 21st Century) | none | 4 | COCODE_MENTION_ONLY |
| Farmers consolidated | 8 named exchanges/companies | 48+ table CoCodes | **7 cover companies** | **41 affiliates** | CONSOLIDATED_EXAM_EXPLICIT |

FL OIR: 10 insurer-titled PDFs attempted; all connection timeouts. Not used to attach.

## EXTRACTION (CA financial unique PDFs)

X1 129 · X2 129 · X3 10 · X4 7 · X5 0 · X6 1 · X7 6 · X8 118 · X9 4 · X10 0 · X11 7 · X12 7 · X13 0

X5+…+X10 = X1.

Mention-only CoCode instances not attached: 58.

Examined Farmers CoCodes: 21652, 21660, 21709, 10315, 10318, 21687, 10317.

## INGEST / PILOT

Inserts 0. Identity writes 0. Second-run 0. **Wave 1 = 0.** Candidate if a profile UI launches later: 7 PUBLIC_READY-capable insurers from the Farmers explicit scope. Not published (no routes, no sitemap, no ranking).

## NEXT TASK

**INS-INSURER-005 — legal-insurer profile UI for the 7 Farmers explicit-scope exams**, or a CoCode-bearing catalog for the 118 NAME_ONLY CA reports.

Do not start it.
