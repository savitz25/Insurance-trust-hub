-- Repair: production Insurance Supabase did not have set_updated_at()
-- from schema.sql. Safe to run if 20260821120000 created the table and
-- then failed on the trigger.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $set_updated_at$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$set_updated_at$;

DROP TRIGGER IF EXISTS agency_listing_requests_updated_at ON agency_listing_requests;
CREATE TRIGGER agency_listing_requests_updated_at
  BEFORE UPDATE ON agency_listing_requests
  FOR EACH ROW EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE agency_listing_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can submit listing requests" ON agency_listing_requests;
CREATE POLICY "Public can submit listing requests"
  ON agency_listing_requests
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'received');

COMMENT ON TABLE agency_listing_requests IS
  'Agency claim / listing requests. Not a public directory. Verified providers are created only after official license confirmation.';

INSERT INTO agency_listing_requests (
  id,
  status,
  legal_name,
  dba_name,
  license_state,
  license_number,
  npn,
  street,
  city,
  address_state,
  zip,
  phone,
  work_email,
  website,
  lines_of_authority,
  authorized,
  notes,
  source,
  submitter_name,
  claimed_signals,
  ops_notes
) VALUES (
  '8f3c1e20-8a17-4b9e-9c21-0b15b8510001',
  'needs_info',
  'BBS Insurance',
  NULL,
  'MO',
  NULL,
  NULL,
  '500 Cates Dr',
  'Lawson',
  'MO',
  '64062',
  '(816) 205-4664',
  'mbriegel@bbs-insurance.com',
  'https://bbs-insurance.com',
  ARRAY['health', 'medicare', 'life']::TEXT[],
  TRUE,
  'Inbound email to hello@ 2026-08-17. Asked how to get listed. Cited BBB A rating, approaching 100 five-star Google reviews, two KC Metro locations, staff of CS/claims/licensed agents. Cell (816) 830-7442. Did not include a Missouri license number.',
  'inbound_email',
  'Matt Briegel',
  '{
    "bbb": "claimed A / A+ on email and agency site — not used for verification",
    "google_reviews": "claimed ~100 five-star — not used for verification",
    "second_location": "1327 Burlington St, North Kansas City, MO 64116 (agency site)",
    "website_claimed_mo_license": "8407824",
    "website_claimed_npn": "18434570",
    "website_claimed_ks_license": "18434570",
    "website_claim_url": "https://bbs-insurance.com/licensing-and-disclosures/"
  }'::JSONB,
  '2026-08-17 ops: Official Missouri DOI / NAIC SBS licensee lookup is interactive and was not confirmable from this environment. Do not publish. Ask Matt for (1) legal entity name exactly as on the MO license, (2) Missouri agency/producer license number(s), (3) NPN if available, (4) both location addresses. Website disclosures claim MO 8407824 / NPN 18434570 — treat as unverified until official lookup matches. Kansas license is metadata only if later confirmed; do not invent a multi-state badge. BBB/Google are secondary signals only after license verification.'
)
ON CONFLICT (id) DO NOTHING;
