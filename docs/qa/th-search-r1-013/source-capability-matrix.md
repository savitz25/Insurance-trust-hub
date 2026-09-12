# Source and capability matrix

Baseline: `8051be7d5169929e42155cab81effa94178e8aad`. Oracle: [source-oracle.json](source-oracle.json). Read-only observations on 2026-09-12; mutable database rows are not represented as a pinned full-corpus snapshot.

| Source | Field/grain | Permitted operation | Boundary |
|---|---|---|---|
| national_entities | stable id, entity_kind, exact npn, legal_name/display_name | Exact NPN across source classes; bounded agency-name candidates | NPN digits do not imply person/agency. No person-name roster. Display name is not an official DBA. |
| Wave-1 cohort + identity index | canonical_legal_name, naic_cocode, stable entity id | Legal-insurer name/NAIC research and eligible profile links | Limited published cohort, not all legal insurers. Publication status is not credential status; examination jurisdiction is not licensure/domicile. File fingerprints in oracle. |
| license_credentials | entity_id, jurisdiction, class/status, source_observed_at | Credential-jurisdiction agency research; selected identity context | Credential jurisdiction is not office, domicile, service territory or appointment. |
| loa_observations | entity/credential observation, official_text, source_dataset | Source-native agency LOA research; issuer dataset is restricted to requested jurisdiction using existing lib/national/loa.ts mapping | Before pagination, both credential jurisdiction and LOA issuer jurisdiction are applied. An LOA from another state's dataset cannot qualify the firm. No appointment inference. |
| national_relationships | from/to stable entity ids, appointed_by, source clock | Selected NPN plus bounded carrier-class appointer name; exact observed relationship | Carrier/appointer is not automatically legal insurer; no name-only legal-insurer bridge. Missing evidence is not unauthorized. |
| cms_marketplace_observations | exact NPN, plan_year, observation/status, source clock | Federal overlay after source identity/class resolution | No default person class; no state credential status from Marketplace. Multiple observations are not multiple providers. |
| providers (public directory) | verified/publication gate + contact.address.zip | Recorded ZIP equality before limit/order; actual directory continuation | Separate listing identity. Product context stays unresolved. No city-to-ZIP guess, service area, LOA or graph identity inference. |
| Existing state intelligence routes | approved FL/TX/NJ/CA/WA/CO/VA/NY/IL routes | Jurisdiction-relevant recovery | State page does not imply acquired roster or a provider status finding. |

Independent positives: organization NPN 10391484; Gulfstream agency NPN 20168263; Citizens legal insurer NAIC 10064; bounded public directory rows whose recorded ZIP is 33441. Similar names remain separate identities. No official alias source was added or invented.

The original Texas Life query used an entity's Life observation without constraining the observation's issuer jurisdiction. The bounded audit returned 25,971 under that legacy query and 25,565 when the existing Texas issuer contract was required. These are timestamped audit observations, not production constants or an assertion of identical source universes. A deeper nested credential join timed out under current source limits; the existing issuer-dataset mapping supplies the same required jurisdiction distinction without a new index or ingestion.

Source clocks remain per-row source_observed_at/report dates. Retrieval time and deployment time are separate. A report date is not a license-effective date.
