# INS-NAT-008 — Agency contact observation backfill

Official-regulator provenance only. Lineage: staging → `source_record_links` → `national_entities`.

- Observations: 123,303
- Agencies with ≥1 observation: 60,506 / 81,943
- Fingerprint: `9e353c8baa9ab81f2e4f49364d4f202525feb44057f9a0338958b536bc707476`
- NV/MS inspected, not attached
- TX city/ZIP not stored as offices
- No Google Places
- `providers` 170,499 unchanged
- `public_eligible` is storage policy; nothing published
- Named contacts `public_eligible=false`

`value` is normalized for idempotency; `label` keeps `raw=…` plus extension / address class / source class.
