# MA-INS-002 — follow-up public records request (entity type)

**Do not file until authorized.** Estimate-before-work if a fee applies ($25 gate).

## Why

Massachusetts extract `Henry_August 2026.csv` / `ma-doi-regulatory-2026-08.csv` has no licensee/entity-type field.

After exact-NPN resolution against other official state extracts:

- 7,059 NPNs were already InsuranceTrustHub agencies (MA-INS-001)
- 128 additional NPNs are official businesses in FL DFS / TDI agency / VT / Ohio extracts (MA-INS-002)
- **1,961 valid NPNs remain UNRESOLVED** for entity type
- 1 malformed identifier (`9950`) is not an NPN

Name, LLC/Inc, email, phone, and address are **not** used to classify.

## Request body (electronic CSV preferred)

To: Massachusetts Division of Insurance — public records

Please provide an electronic extract for the same **Active Insurance Producer** population as the August 2026 file previously supplied (9,151 rows; NPN + LICENSE_NO + LICENSE_CLASS Insurance Producer), limited to these columns:

1. NPN  
2. LICENSE_NO  
3. LAST_NAME_OR_BUSINESS_NAME (or equivalent legal name)  
4. **LICENSEE_TYPE / ENTITY_TYPE / INDIVIDUAL_OR_BUSINESS indicator** (whatever official field distinguishes individual producers from business entities)

Do not resend phone, email, address, LOA, or domicile unless required to join the type field to NPN.

Preferred format: CSV or native spreadsheet. As-of date on the extract if available.

If a fee applies, please provide an estimate before work ($25 threshold).
