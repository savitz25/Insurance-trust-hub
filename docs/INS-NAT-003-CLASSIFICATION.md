# INS-NAT-003 — Entity classification and national denominator policy

Classification infrastructure and analysis only. No graph backfill. No public changes.

Registry version: **1.0.0**

---

## A. STATUS

**COMPLETE WITH BLOCKERS**

Classification constitution, versioned registry, tests C1–C13, and a dry-run of all 185,167 staging rows are done. Production graph tables are still absent. Ohio license class is still unrecovered. Nevada and Mississippi remain provisional (no NPN). Current-vs-historical agency counts are not computable from this extract (status/expiration were not pulled). This is identity and classification coverage within current data — not total Florida or national market coverage.

---

## B. PRODUCTION GRAPH STATUS

| Item | Value |
|------|--------|
| `origin/main` SHA | `fe1a83841b65d087c7803b76cbcd8dbb284a1dbc` |
| Graph SQL applied | **NO** |
| Graph tables present | **NO** (`national_entities` / `license_credentials` PostgREST 404) |
| Graph backfill executed | **NO** (explicitly not executed) |
| Migration file | `supabase/migrations/20260826120000_national_identity_graph.sql` |
| SHA-256 | `d918e1161fe77a9f582453285dc2372d463f41a4ca5caa15d1b07e411ec1f4c8` |
| Public `providers` | 170,499 (unchanged) |
| Staging extract | 185,167 rows (`dfs` 98,622 / `tdi` 48,733 / `odi` 5,306 / `nv` 19,879 / `vt` 1,984 / `ms` 10,643) |

Unapplied SQL is **not** a blocker for classification. It **is** a blocker for any persisted national graph.

---

## C. METRIC CORRECTION (Florida repeated NPN)

INS-NAT-004’s “~79%” figure is **not** the share of Florida rows that repeat an NPN.

Exact calculations on the current Florida extract (`florida_dfs`, n = 98,622):

| Quantity | Count | Denominator / formula |
|----------|------:|------------------------|
| Florida records | 98,622 | source rows |
| Valid NPN rows | 98,547 | `normalizeNpn` accepts 5–10 digits (50 blank + 25 invalid = 75 non-valid) |
| Distinct NPN identities | 78,179 | unique valid NPNs |
| NPNs with 2+ Florida credentials | 1,670 | NPNs with count ≥ 2 |
| Extra rows beyond first identity | 20,368 | 98,547 − 78,179 |
| Rows in repeated-NPN groups | 22,038 | 20,368 + 1,670 |
| **Rows in repeated-NPN groups** | **22.35%** | 22,038 / **98,622 records** |
| Distinct NPN / records | **79.27%** | 78,179 / 98,622 |

**Unsupported claim:** “~79% of Florida rows share/repeat an NPN.”

**Correct claim:** 78,179 / 98,622 ≈ 79.3% is **distinct-NPN identities per Florida records**. The repeated-NPN row share is **22,038 / 98,622 ≈ 22.3%**.

Helper: `lib/national/metrics.ts` → `floridaRepeatedNpnMetrics`. Test C13.

---

## D. CLASSIFICATION CONSTITUTION

Four separate concepts. Never collapse them.

1. **Entity kind** — `person` | `agency` | `carrier`
2. **Credential namespace** — `producer` | `bail_bond` | `adjuster` | `title` | `warranty` | `surplus_lines` | `tpa` | `limited_lines` | `other`
3. **Insurance role** — core producer agency, specialty producer, ancillary distributor, claims adjuster, warranty association, title agency, bail agency, TPA, carrier, unknown
4. **Product / denominator eligibility** — which headline metric the row may enter

### What counts as an InsuranceTrustHub insurance agency (core)

A **business entity** licensed to transact ordinary life, health, property, casualty, or personal-lines insurance as a producer/agency:

- Florida `AGENCY LICENSE` (Fla. Stat. 626.015, 626.112)
- Texas `General Lines Agency`, `Life Agency`, `Pers Lines Prop and Cas Agency` (plus high-confidence county mutual / small life agency)
- Nevada `Resident` / `Non-Resident Producer Firm` (NRS 683A) — **role** only until NPN exists
- Vermont `Insurance Producer`
- Mississippi `Insurance Producer Entity` — **role** only until NPN exists

Counted **once nationally per confirmed NPN**, even with thousands of licensed locations or mixed specialty credentials.

### What does not

Warranty associations (Fla. Stat. ch. 634; NRS 690C); limited-line retailers (Fla. Stat. 626.321); public/independent adjusters; bail agencies (ch. 648); title agencies; TPAs; motor clubs; funeral/cemetery sellers; discount health programs; individual producers; one store location of a national retailer; an Ohio row whose class was not imported.

### Mixed credentials

`at_least_one_core_credential_counts_once_as_core_agency`. Specialty credentials stay on the entity; they do not create a second agency and do not veto core status.

### Location networks

`one_national_entity_per_confirmed_npn_not_one_agency_per_licensed_location`.

### Current vs historical

Inactive/expired core credentials do not establish **current** core agency unless another qualifying **current** core credential exists. Missing regulator status → current count is **not computable**.

### Publication

Research denominators ignore `providers.verified`, directory chips, and publication flags.

### Evidence

Raw regulator terminology is preserved on the credential. Classification is a versioned overlay. Changing the overlay does not rewrite historical source evidence.

### Confidence

`CONFIRMED` | `HIGH_CONFIDENCE` | `REVIEW_REQUIRED` | `UNRESOLVED`. Unknown Ohio never becomes core. Heuristics are never `CONFIRMED` and are never applied to empty Ohio classes.

---

## E. DENOMINATOR DICTIONARY

| Metric | Definition |
|--------|------------|
| **Source records** | Official source rows observed. Not agencies. |
| **Credentials monitored** | State license credentials. In this extract, 1 record = 1 credential. |
| **Confirmed identities** | Distinct valid NPNs (agency kind). One NPN = one national identity. |
| **Provisional identities** | Source-clear rows with no valid NPN. Never merged by name/address. NV and MS currently live here even when role is classified. |
| **REVIEW_REQUIRED identities** | Same-NPN legal-name conflicts. Not a license-class label. |
| **Core-agency credentials** | Credential rows classified core-eligible. |
| **Core-agency entities** | Identities with ≥1 CONFIRMED/HIGH core credential. Mixed specialty does not add a second entity. Includes provisional cores (MS/NV producer firms) — do not headline this as confirmed. |
| **Current core agencies** | Core identities with ≥1 currently active core credential. **Null** in this dry-run (status not in extract). |
| **Specialty / ancillary / claims / warranty / title / bail / TPA entities** | Identities whose **primary** product class is that family **and** that are not core-eligible. |
| **Unknown entities** | Every credential is `unknown_pending_classification` (Ohio-only is the main case). |
| **Multi-state core agencies** | Core identities observed in 2+ jurisdictions **in the current extracts**. Not a complete US multi-state census. |
| **Research vs publication** | Research counts ignore public listing. |

Never say “185,167 insurance agencies.” That is credential rows.

---

## F. SOURCE-BY-SOURCE CLASSIFICATION MATRIX

| State | Official support | Class in staging | Identity | Core rule |
|-------|------------------|------------------|----------|-----------|
| **FL** | Fla. Stat. 626.015/112/321/854/8548; ch. 634; ch. 648; 626.8417; DFS Agent Services; valid-business bulk download | 24 TYCL classes, all populated | NPN on 98,547 / 98,622 | `AGENCY LICENSE` only among observed types |
| **TX** | TDI agent lists; Socrata 3yqc-fcdt; NIPR TX business classes; TIC 4051/4054/4055/4101/2651/981 | 21 license types, all populated | NPN on 48,665 / 48,733 | General Lines / Life / Personal Lines (+ 2 HIGH county-mutual / small-life) |
| **OH** | ODI major-lines business entity; ORC 3905.06; mailing list. ODI also licenses limited lines, MGA, surplus, title, bail, TPA, public adjuster | **Empty for all 5,306** | NPN on all 5,306 | **None.** Remain unknown. Do not infer from name. |
| **NV** | NRS 683A/684A/690C/696A; DOI firm types | 33 firm types | **NPN absent** | Producer firms = core **role**; identity **provisional** |
| **VT** | 8 V.S.A. producer; DFR quarterly list | 4 classes | NPN on 1,982 / 1,984 | `Insurance Producer` |
| **MS** | MID Insurance Producer Entity | 1 class (all rows) | **NPN absent** | Core **role**; identity **provisional** |
| NJ/NC/MA | — | empty | — | — |

---

## G. FLORIDA CLASSIFICATION RESULTS

Identity coverage inside the current valid-business extract. **Not** “total Florida market coverage.”

| Metric | Count | Denominator |
|--------|------:|-------------|
| Records / credentials | 98,622 | Florida source rows |
| Valid NPN rows | 98,547 | Florida records |
| Distinct NPN identities | 78,179 | unique valid NPNs |
| Identities (NPN + provisional keys) | 78,254 | 78,179 + 75 |
| Core-agency credential rows | 58,642 | `AGENCY LICENSE` |
| Distinct qualifying core-agency identities | 57,236 | FL-scoped identities with ≥1 core credential |
| Current core agencies | **not computed** | status omitted; source is valid-licenses so current-at-observation only |
| Specialty credentials / entities | 270 / 175 | MGA + reinsurance (primary, not core) |
| Ancillary credentials / entities | 7,658 / 1,197 | limited lines |
| Claims credentials / entities | 1,798 / 1,694 | public/independent adjusting firms |
| Warranty credentials / entities | 27,048 / 14,755 | service / auto / home warranty |
| Title credentials / entities | 2,639 / 2,634 | title agencies |
| Bail credentials / entities | 566 / 562 | bail bond agency |
| Unknown credentials | 1 | raw type `L129848` (looks like a license number) |
| Multi-credential core agencies | 897 | core identities with 2+ FL credentials |
| Multi-state core NPNs also in TX | 18,288 | FL core NPNs ∩ TX |
| also in OH | 852 | FL core NPNs ∩ OH (OH class still unknown) |
| also in VT | 1,650 | FL core NPNs ∩ VT |
| any other populated state | 18,810 | FL core NPNs with ≥1 other jurisdiction in extract |
| Provisional | 75 | no valid NPN |
| REVIEW_REQUIRED (name conflict) | 368 | FL-scoped |

Warranty + limited lines + store NPNs are why 98,622 Florida rows are not 98,622 agencies.

---

## H. TEXAS CLASSIFICATION RESULTS

| Metric | Count |
|--------|------:|
| Records / credentials | 48,733 |
| Valid NPN rows | 48,665 |
| Distinct NPN identities | 43,403 |
| Identities | 43,471 |
| Core-agency credentials | 42,326 |
| Core-agency identities | 39,944 |
| Specialty credentials / entities | 4,446 / 1,786 |
| Ancillary | 177 / 105 |
| Claims | 894 / 750 |
| Title | 847 / 847 |
| Unknown | 0 |
| Multi-credential core | 4,560 |
| Multi-state core also in extract | 18,585 |
| Provisional | 68 |
| REVIEW_REQUIRED | 331 |

Texas is the cleanest classified producer-agency source after Florida’s agency-license subset.

---

## I. OTHER STATE RESULTS

### Ohio

| Metric | Count |
|--------|------:|
| Records | 5,306 |
| Valid NPN / distinct NPN | 5,306 / 5,306 |
| Unknown credentials | **5,306** |
| Core-agency credentials | **0** |
| Core-agency identities (OH-only rollup) | **0** |

Official ODI class exists (major lines, limited lines, MGA, surplus, title, bail, TPA, public adjuster) but was not imported. Names such as `1 2 3 ASAP BAIL LLC` prove the file is mixed. **Remain unknown.** Nationally, 1,055 of these NPNs also have classified FL/TX/VT credentials, so national unknown **entities** fall to 4,251; the Ohio **credentials** stay unclassified.

### Nevada

| Metric | Count |
|--------|------:|
| Records | 19,879 |
| NPN | **0** — all provisional |
| Core-role producer firms | 16,948 (14,985 non-resident + 1,963 resident) |
| Specialty / claims / warranty / title / bail / TPA | 1,343 / 431 / 271 / 128 / 68 / 582 |

Role is classified. Identity is **not** confirmed. Excluded from the proposed confirmed backfill.

### Vermont

| Metric | Count |
|--------|------:|
| Records | 1,984 |
| Distinct NPN | 1,982 |
| Core (`Insurance Producer`) | 1,937 credentials / identities |
| Ancillary | 46 |
| Claims | 1 |
| Multi-state core | 1,780 (mostly non-resident producers) |

### Mississippi

| Metric | Count |
|--------|------:|
| Records | 10,643 |
| NPN | **0** — all provisional |
| Class | all `Insurance Producer Entity` (core role) |

Role classified. Identity provisional. Excluded from confirmed backfill.

---

## J. LOCATION-NETWORK FINDINGS

201 NPNs have 11+ credentials in the current extracts. Largest:

| NPN | Name | Credentials | Primary class | Core? | States |
|-----|------|------------:|---------------|-------|--------|
| 8203073 | NEW CINGULAR WIRELESS PCS, LLC | 3,599 | specialty / mixed limited-lines | **no** | FL, TX, VT |
| 7821100 | T-MOBILE USA INC. | 951 | specialty / mixed | **no** | FL, TX |
| 16880439 | METROPCS FLORIDA, LLC. | 799 | ancillary (portable electronics) | **no** | FL |
| 17238644 | DIRECTV, LLC | 626 | warranty | **no** | FL |
| 15989248 | NEXTEL SOUTH CORP. | 625 | ancillary | **no** | FL |
| 8097583 | AT&T CORPORATION | 76 | warranty | **no** | FL |
| 7698019 | T-MOBILE USA INC. (second NPN) | 270 | warranty | **no** | FL |

**Correct counting**

- 3,599 New Cingular credentials = **1 entity**, 3,599 location licenses, **0 core agencies**.
- They are portable-electronics / specialty / warranty retailers, not insurance agencies.
- AT&T Corporation (76) is warranty, not core.
- Mattress Firm (190) is warranty (a `/at&?t/` regex also matched “MATTRESS”; the entity is still correctly non-core).

---

## K. MIXED-CREDENTIAL ENTITY FINDINGS

42,951 identities have more than one product class in the extract. 40,275 of those are core-eligible and are counted **once** as core.

Typical patterns:

- FL `AGENCY LICENSE` + TX `General Lines` + OH unknown → **one core agency**; Ohio credential remains unknown.
- FL `AGENCY LICENSE` + FL warranty or limited lines → **one core agency**; specialty credentials retained.
- TX `General Lines` + `Surplus Lines` → **one core agency** with a specialty credential.
- New Cingular mixed specialty/ancillary/warranty **without** a core agency license → **not** core.

---

## L. NATIONAL DRY-RUN DENOMINATORS

Dry-run of 185,167 staging rows. Overlay only. No inserts.

| Metric | Count | Denominator |
|--------|------:|-------------|
| All source records / credentials monitored | 185,167 | extract rows |
| All confirmed identities | 107,084 | distinct valid NPNs |
| All provisional identities | 30,667 | NV 19,879 + MS 10,643 + FL/TX/VT missing-or-invalid NPN |
| REVIEW_REQUIRED identities | 371 | same-NPN name conflicts |
| Core-agency entities (incl. provisional cores) | 106,703 | identities with ≥1 core credential |
| **Confirmed-NPN core (proposed cohort)** | **78,668** | see Q |
| Current core agencies | **null** | status not in extract |
| Specialty entities (primary, not core) | 3,216 | |
| Ancillary entities | 1,301 | |
| Claims entities | 2,500 | |
| Warranty entities | 14,968 | |
| Title entities | 3,532 | |
| Bail entities | 630 | |
| TPA entities | 582 | |
| Out-of-scope entities | 68 | |
| Unknown/unclassified entities | 4,251 | Ohio-only NPNs |
| Multi-state core agencies | 19,170 | core identities in 2+ extract states |
| Core-agency credentials | 130,496 | includes NV/MS producer-firm rows |

**Do not headline 106,703 or 130,496 as “insurance agencies.”** Those include Mississippi and Nevada provisional producer firms and, for credentials, every core-classified license row.

---

## M. CLASSIFICATION REGISTRY IMPLEMENTATION

| Path | Role |
|------|------|
| `lib/national/classification/types.ts` | Overlay types; `CLASSIFICATION_REGISTRY_VERSION = 1.0.0` |
| `lib/national/classification/taxonomy.ts` | Constitution, official citations, mixed/location policy, product priority |
| `lib/national/classification/registry.ts` | Versioned (jurisdiction, source, raw type) → namespace/role/product/eligibility/confidence |
| `lib/national/classification/apply.ts` | Classify credential; roll up entity; research denominators |
| `lib/national/classification/index.ts` | Public barrel |
| `lib/national/metrics.ts` | Florida repeated-NPN correction |
| `scripts/check-ins-nat-003.ts` | C1–C13 |
| `scripts/national/classify-dry-run.ts` | Full-extract dry-run (no writes) |
| `docs/INS-NAT-003-CLASSIFICATION.md` | This document |

Lookup key: `jurisdiction|sourceDataset|normalizedRawType`. Unmatched non-Ohio strings may use a conservative heuristic (never `CONFIRMED`). Empty Ohio → `UNRESOLVED` / not core.

`npm run check:ins-nat-003`  
`npm run national:classify-dry-run`

---

## N. TEST RESULTS

| ID | Result | What it proves |
|----|--------|----------------|
| C1 | PASS | FL `AGENCY LICENSE` and TX `General Lines Agency` → core eligible |
| C2 | PASS | Bail retained, not core |
| C3 | PASS | Adjuster → `claims_service`, not producer agency |
| C4 | PASS | Warranty classified independently, not core |
| C5 | PASS | Core + specialty → one core entity |
| C6 | PASS | 100 locations, one NPN → 1 entity |
| C7 | PASS | 100 credentials remain 100 |
| C8 | PASS | Empty Ohio class is unknown, not core (even if name says BAIL) |
| C9 | PASS | Expired core does not establish current; another active core does |
| C10 | PASS | Publication flag does not change research denominators; person profiles still gated |
| C11 | PASS | Raw DFS TYCL string preserved |
| C12 | PASS | Overlay does not mutate source evidence; version pinned |
| C13 | PASS | Repeated-NPN percentages use the correct denominators |

---

## O. PUBLIC DIRECTORY RECOMMENDATION

**Do not implement now.**

`/directory` should primarily represent **core insurance agencies** — consumer-facing producer firms that sell ordinary life, health, auto, and homeowners coverage.

It should **not** be:

- agencies + every individual producer (individuals stay gated; a consumer directory of 100k+ people is not the product);
- every regulator-licensed insurance-related business (warranty dealers, bail bondsmen, portable-electronics kiosks, TPAs).

Specialty filters can sit **on top of** the core agency directory later. They should not define the default browsing scope.

| Specialty | Eventual treatment |
|-----------|-------------------|
| Title | Dedicated directory filter (consumers actually search for title companies) |
| Public adjusters | Dedicated filter or a small specialty hub (distinct consumer job) |
| Bail | Profile-only or a separate specialty hub — **not** the primary directory |
| Warranty / service contracts | Internal research + profile-only if a public record is needed. Car dealers and wireless stores must not flood `/directory` |
| Limited-line retailers (portable electronics, travel, credit, rental, in-transit) | Internal-only research. Store-location networks stay off the primary directory |

---

## P. HUB INTELLIGENCE RECOMMENDATION

### Defensible later (once graph SQL exists), with the exact wording

- “X unique **confirmed-NPN** producer identities tracked in our current extracts”
- “Y **state credentials** monitored”
- “Z confirmed-NPN **core agencies** with at least one core-agency credential (FL/TX/VT extracts)”
- “W of those core agencies also licensed in another state **in our current extracts**”
- “V specialty insurance entities tracked (surplus, MGA, …)”
- “U warranty / limited-line location credentials monitored”

On this dry-run, the only confirmed-core number we would defend is **78,668** (proposed cohort), not 185,167, not 106,703, not 98,622.

### Blocked / never

- “185,167 insurance agencies” (credential rows)
- “78,179 Florida agencies” without saying identities-in-extract
- Any **national market** total (six states, two without NPN, Ohio unclassified)
- **Current** core agencies until regulator status is joined
- Counting each AT&T/T-Mobile location as an agency
- Treating NV/MS producer firms as confirmed identities
- Treating unpublished vs published as different research counts
- Rewriting stale Trust Hub `checked_at` as regulator expiration

### Headline handling

| Issue | Rule |
|-------|------|
| Store-location networks | 1 entity; credentials/locations are a separate metric |
| Missing-NPN states | Provisional bucket only; never in confirmed identity headlines |
| Unclassified Ohio | Unknown bucket; never silently in core |
| Provisional identities | Separate line, or omit from homepage |
| Stale observations | Observation freshness ≠ regulator status |

---

## Q. PROPOSED CONFIRMED BACKFILL COHORT

**Not executed.**

Eligibility:

1. Valid NPN (confirmed identity)
2. Agency entity kind
3. ≥1 credential classified `core_agency` at CONFIRMED or HIGH_CONFIDENCE
4. Identity confidence is not `REVIEW_REQUIRED`
5. Entity is not classification-unknown
6. Mixed core+specialty **included once**
7. NV/MS (no NPN) **excluded**
8. Ohio-only unknown **excluded**
9. Warranty, bail, adjuster, title, limited-line-only, TPA **excluded** unless they also hold a core credential

| | Count |
|--|------:|
| Source records / expected credentials in scope | 106,885 |
| Expected entities | **78,668** |
| Multi-state entities (in current extracts) | 18,839 |
| Provisional excluded | 30,667 |
| REVIEW_REQUIRED excluded | 371 |
| Classification-unknown excluded | 4,251 |
| Non-core confirmed identities left out | 23,819 |
| Fingerprint SHA-256 of sorted NPNs | `2fc38aeb673eae2fd2f311694a514bbf361cea9e2938577a579667504b65e894` |
| Executed | **false** |

This cohort is **not** a national market denominator. It is the confirmed-NPN core-agency subset of FL+TX+VT (plus those same NPNs’ other-state credentials in the extract).

---

## R. RISKS / BLOCKERS

1. **Graph SQL unapplied** — nothing to insert into.
2. **Ohio classification** — 5,306 credentials unknown; ODI mailing list types were not imported. Names include bail firms. Cannot assume major-lines agencies.
3. **Provisional NV/MS identity** — 30,522 producer-role rows without NPN. Role ≠ confirmed national identity.
4. **Regulator taxonomy ambiguity** — TX `Specialty Insurance Agency` treated as specialty not core (HIGH). TX county mutual / small life treated as core (HIGH). FL `L129848` review.
5. **Retail-location networks** — wireless/warranty chains dominate high-credential NPNs and must never inflate agency counts.
6. **Stale / missing credential status** — current core is not computable from this extract.
7. **Mixed-credential entities** — 40k+ cores also hold unknown Ohio or specialty rows; entity policy is sound, reporting must show both layers.
8. **Coverage** — six populated states. Not the United States.

---

## S. RECOMMENDED NEXT TASK

**GRAPH SCHEMA APPLY + OHIO LICENSE-CLASS RECOVERY**

Do **not** run CONFIRMED CORE-AGENCY GRAPH BACKFILL yet.

We can describe a 78,668-entity confirmed core cohort, but we do **not** have a defensible **national** agency denominator:

- production has no graph tables;
- Ohio is unclassified;
- Nevada and Mississippi cannot join confirmed identity;
- most US states are absent.

Backfilling 78k entities into a schema that does not exist, while 5,306 Ohio rows would land as unknown and 30k NV/MS rows would be excluded, would freeze an incomplete denominator into the graph.

Next single task: apply `20260826120000_national_identity_graph.sql` to production, then recover Ohio `license_types` / major-vs-limited-vs-bail-vs-title from the official ODI mailing list (or an equivalent official extract) **without** inferring class from legal name. After that, re-run this dry-run and reconsider a confirmed core-agency backfill.

Carrier spine / appointment normalization and contact-observation backfill remain valuable, but they are not the thing blocking a defensible agency count.

---

## Success standard (this task)

| Question | Answer |
|----------|--------|
| What is an InsuranceTrustHub insurance agency? | A business-entity producer licensed for ordinary life/health/P&C/personal lines, counted once per confirmed NPN. |
| What is not? | Warranty, limited-line retail, adjusters, bail, title, TPA, motor club, individuals, store locations, unclassified Ohio. |
| Specialty still valuable? | Yes — retained and counted in specialty/claims/warranty/title/bail/TPA buckets. |
| Company with thousands of locations? | 1 entity, N credentials. New Cingular = 1 non-core specialty entity, 3,599 credentials. |
| Mixed licenses? | ≥1 core credential → one core agency; other families remain on the profile. |
| Which states have enough class evidence? | FL, TX, NV (role), VT, MS (role). OH does not. |
| Unique national core agencies in existing data? | **78,668 confirmed-NPN core** in the proposed cohort. **Not** 185,167. **Not** 106,703 (that includes provisional NV/MS). |
| State credentials those agencies hold (cohort)? | 106,885 |
| Operate in multiple extract states? | 18,839 of the proposed cohort |

records ≠ credentials ≠ entities ≠ locations.
