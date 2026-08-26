# INS-NAT-006 — Confirmed-core national graph backfill

Executed against production after INS-NAT-005 schema verification PASS.

- Registry: 1.1.0
- Entity fingerprint: `26e5a041284260df4c10cc9350882698ac258c005dad2720e957594368efc08c`
- Credential fingerprint: `c6a6617dfdbcba32bf51eca89d4d98555848736f4c149ed65cb5008770193198`
- Canonical name policy: core credential, then source order FL > TX > OH > VT, then longest trimmed legal name, license-number tie-break
- LOA observations: deferred
- Provider bridges: deferred (0)
- Contacts: not written
- Public `providers`: 170,499 unchanged

Command:

```text
npx tsx scripts/national/backfill-confirmed-core.ts
npx tsx scripts/national/backfill-confirmed-core.ts --execute
```

This is not a United States market total.
