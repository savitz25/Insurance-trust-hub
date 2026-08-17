# Agency listing intake

Durable path for an agency to request a public research listing. This is not a
seed catalog and not "email us and we list you."

Public directory remains **verified only**. A request is never a listing.

## Product rules

1. `resolveProviderTrustState` must return `verified` before a profile is public.
2. Verification requires a provable state license: number + state + active/valid status.
3. Never create a verified listing from marketing claims (BBB, Google reviews, "a real person answers").
4. Home office / other-state presence is metadata only. Do not invent multi-state badges.
5. Agencies / firms are the default claim subject. Individuals are out of scope unless product later allows them.
6. No paid placement, no lead forms on this path, no "get listed faster" language.
7. States without bulk DOI inventory (Missouri today) use this manual claim + ops verification. Do not invent a bulk scrape for one agency.

## Public URL

[https://www.insurancetrusthub.com/claim-listing](https://www.insurancetrusthub.com/claim-listing)

Soft links: `/directory`, About, footer (Verify & trust), `/contact`.

## What the submitter must provide

Required: legal business name, state of license, license number, primary address, phone, work email, authorization checkbox.

Optional: DBA, NPN, website, lines of authority, notes.

Reviews / BBB are optional notes only. They never substitute for a license.

## Storage

Table: `agency_listing_requests`

Statuses: `received` | `needs_info` | `verifying` | `approved` | `rejected` | `withdrawn`

RLS: public INSERT of `received` only. **No public SELECT of PII.**

Admin list (`/admin/listing-requests`) is a server page (`force-dynamic`). After the shared-secret admin cookie is checked, it reads rows with `SUPABASE_SERVICE_ROLE_KEY` via PostgREST (same path as `GET /admin/api/listing-requests`). It lists every status. It does not use the anon key and must not add a public SELECT policy.

If the SQL table exists but the admin page is empty, reload the PostgREST schema cache:

```sql
NOTIFY pgrst, 'reload schema';
```

Linked `provider_id` is set only on approve.

## Ops procedure (every request)

1. Confirm the submitter email domain matches the agency, or that authorization is explicit.
2. Look up the license on the **official state source** (Missouri: NAIC SBS licensee lookup for jurisdiction MO, or Missouri DCI licensee search).
3. Match legal name + license number + active status + address reasonableness.
4. If mismatch or lookup fails: mark `needs_info` or `rejected` with a plain reason. Ask for the missing official fields. Do not publish.
5. If match: approve in `/admin/listing-requests/[id]`. That path creates a `providers` row with:
   - `verified = true` only after Phase 1 gates pass
   - `license_info` provenance: `method = manual`, notes include `manual_claim`, regulator = that state's DOI
   - `states_licensed` = the confirmed license state only
   - `license_checked_at` = now
   - contact JSON consistent with FL/TX/NV (phone, email, website, address)
6. Fail closed: if `resolveProviderTrustState` is not `verified`, the created row is deleted and the request stays unapproved.
7. Optional secondary (Google Places / BBB) only **after** verify, labeled third-party, never ranking.

Admin: `/admin/listing-requests`

## Missouri (no bulk inventory)

ITH does not have a Missouri bulk DOI import. Manual claim is the correct path.

Official lookup (interactive):

- [NAIC SBS licensee lookup (MO)](https://sbs.naic.org/solar-external-lookup/lookup/licensee?jurisdiction=MO)
- [Missouri DCI licensee search](https://insurance.mo.gov/CompanyAgentSearch/search/search-agents.php)

If the official tool cannot be completed, leave the request `needs_info`. Do not treat the agency website as the regulator.

### Pilot: BBS Insurance / Matt Briegel (2026-08-17)

Inbound email to `hello@insurancetrusthub.com` from `mbriegel@bbs-insurance.com`.

| Field | Value |
| --- | --- |
| Request id | `8f3c1e20-8a17-4b9e-9c21-0b15b8510001` |
| Status | `needs_info` |
| Agency | BBS Insurance (domain bbs-insurance.com) |
| Contact | Matt Briegel, President & Agency Owner |
| Address given | 500 Cates Dr, Lawson, MO 64062 |
| Phones | office (816) 205-4664; cell (816) 830-7442 |

**Not verification:** BBB rating, Google review counts, "real person answers."

**Website-claimed numbers** (https://bbs-insurance.com/licensing-and-disclosures/) recorded as claims only:

- NPN 18434570
- Missouri license 8407824
- Kansas license 18434570 (metadata only if later confirmed; not a second badge)

Official MO DOI / SBS lookup was **not confirmable** from the builder environment. Do not publish until an operator matches those numbers (or the numbers Matt replies with) on the official lookup, including active status and legal entity name.

Ask Matt for:

1. Legal entity name exactly as on the Missouri license
2. Missouri agency/producer license number(s)
3. NPN if available
4. Both location addresses

Suggested human reply is stored below. After official confirmation, approve in admin and reply with the live profile URL.

## Reply templates (hello@)

### Received / needs license number

Thanks for reaching out. InsuranceTrustHub lists agencies only after we verify an active state insurance license -- not based on reviews or paid placement.

Please reply with: (1) legal entity name exactly as on the Missouri license, (2) Missouri agency/producer license number(s), (3) NPN if available, (4) both location addresses.

You can also submit the same details here: https://www.insurancetrusthub.com/claim-listing

Once we confirm active MO licensure, we can publish a verified profile.

### Approved

We confirmed an active Missouri license and published a verified research listing: https://www.insurancetrusthub.com/providers/{slug}

That listing shows the Missouri license we verified. Reviews and BBB ratings are not a ranking and are not how the listing was created.

### Rejected

We were not able to confirm an active state insurance license that matches the name and number provided, so we cannot publish a verified listing. If you have a different legal name or license number on the official record, reply with those details and we will check again.

## Next inbound email (same path)

1. Record it (form auto-inserts; or insert a row with `source = inbound_email`).
2. Official lookup. Never BBB/Google as proof.
3. `needs_info` / `rejected` / approve.
4. Reply from hello@ with the matching template.

## Out of scope

- Paying for placement
- Scraping BBB as proof of license
- Bulk Missouri statewide import in this task
- Auto-approving inbound email without a license check
- Move Trust Hub
