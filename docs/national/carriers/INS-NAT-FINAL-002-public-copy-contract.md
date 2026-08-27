# INS-NAT-FINAL-002 — Public copy contract (design only)

No publication, sitemap, robots, or `/carriers` copy changes in this task.

When a later task renders legal identity, use these labels only.

| Concept | Public wording |
|---------|----------------|
| Legal insurer | Legal regulated insurer |
| NAIC CoCode | NAIC company code |
| Insurance group | Insurance group |
| Consumer brand | Consumer brand |
| State appointer | Appointing entity reported by state regulator |

## Do not use

- **parent company** — unless a later ownership source supports it. NAIC group membership is not by itself parent-company proof.
- **same company** — for brand / legal / group relationships unless the exact semantics are a single legal insurer (one NAIC company code).

## Publication gates (unchanged / extended deny)

`PUBLIC_PERSON_PROFILES_ENABLED = false`

`mayPublishEntityKind`:

- `agency` → true (existing public directory)
- `person` → false
- `carrier` → false
- `legal_insurer` → false
- `insurance_group` → false
- `consumer_brand` → false

Existing `/carriers` sitemap entries are curated Medicare-evidenced **brand** slugs, not graph legal insurers. This task does not add graph-backed carrier pages and does not change the sitemap.
