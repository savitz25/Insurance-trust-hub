# INS-NAT-FINAL-005 — Person verification contract

Flag: `PUBLIC_PERSON_PROFILES_ENABLED = false`  
Gate: `mayPublishEntityKind('person') === false`

## Product stance

People remain **verification-first**.

- No mass person directory
- No sitemap people
- No indexed person profiles
- Public/indexed people = **0**

## What a later verification result may safely show

When an exact person identity exists (NPN CONFIRMED) and a dedicated verification UI is built later:

- name
- NPN
- state credentials
- license class
- lines of authority
- appointments (person `APPOINTED_TO`, not agency appointments)
- CMS Marketplace evidence (CMS registration ≠ state license)
- source / as-of dates
- regulatory evidence **only** when the respondent is that person and the publication gate passes

## What this task does not do

- no person pages
- no person sitemap entries
- no promotion of graph persons onto `providers`
- no inheritance of agency or legal-insurer evidence onto a person

Person mistaken as an agency candidate never receives a provider→agency bridge (bridges require graph `entity_kind = agency`).
