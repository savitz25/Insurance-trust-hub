# Maine Insurance source: active nonresident producer license records

- Primary source: Maine Bureau of Insurance quarterly active nonresident producer spreadsheet.
- Published source clock: August 1, 2026.
- Retrieved: October 12, 2026.
- Source file: `active-nonresident-producers-2026-08-01.xlsx`.
- SHA-256: `360e012590006308db275963cc7f7a52217879a4a0e589d815c22ff5a926f58a`.
- Worksheet `Export Worksheet`: 225,804 license rows; 225,804 distinct license numbers; 225,570 distinct NPN identifiers.
- Native license descriptions: `PRODUCER NON-RESIDENT` 222,983 rows; `PRODUCER LIMITED NON-RESIDENT` 2,821 rows.

This is a person-license slice for nonresident producers who hold Maine authority, not a full Maine producer census. It excludes Maine resident producers and other business/entity and insurer populations. NPN and license number remain separate keys. The workbook includes contact data; the page publishes only population-level counts. Rebuild the aggregate using `python scripts/maine_ins_001_summary.py`.
