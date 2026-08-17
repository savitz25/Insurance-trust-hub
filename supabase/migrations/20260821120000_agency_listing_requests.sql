-- Agency listing intake (manual claim + ops verification).
-- Public directory remains verified-only. This table stores requests, not listings.
-- PII: no public SELECT. Writes go through the server action (service role)
-- or a locked anon INSERT of status=received only.
--
-- Production may not have schema.sql helpers. Define set_updated_at here.

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $set_updated_at$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$set_updated_at$;

CREATE TABLE IF NOT EXISTS agency_listing_requests (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status                    TEXT NOT NULL DEFAULT 'received'
                              CHECK (status IN (
                                'received',
                                'needs_info',
                                'verifying',
                                'approved',
                                'rejected',
                                'withdrawn'
                              )),
  legal_name                TEXT NOT NULL,
  dba_name                  TEXT,
  license_state             TEXT NOT NULL,
  license_number            TEXT,
  npn                       TEXT,
  street                    TEXT,
  city                      TEXT,
  address_state             TEXT,
  zip                       TEXT,
  phone                     TEXT,
  work_email                TEXT NOT NULL,
  website                   TEXT,
  lines_of_authority        TEXT[] NOT NULL DEFAULT '{}',
  authorized                BOOLEAN NOT NULL DEFAULT FALSE,
  notes                     TEXT,
  source                    TEXT NOT NULL DEFAULT 'claim_form',
  submitter_name            TEXT,
  claimed_signals           JSONB NOT NULL DEFAULT '{}',
  ops_notes                 TEXT,
  rejection_reason          TEXT,
  verified_license_state    TEXT,
  verified_license_number   TEXT,
  verified_at               TIMESTAMPTZ,
  provider_id               UUID REFERENCES providers(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_agency_listing_requests_status
  ON agency_listing_requests (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agency_listing_requests_email
  ON agency_listing_requests (work_email);
CREATE INDEX IF NOT EXISTS idx_agency_listing_requests_state
  ON agency_listing_requests (license_state);

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

-- No public SELECT / UPDATE / DELETE. Admin UI uses service_role.

COMMENT ON TABLE agency_listing_requests IS
  'Agency claim / listing requests. Not a public directory. Verified providers are created only after official license confirmation.';

-- Pilot inbound email (2026-08-17): Matt Briegel / BBS Insurance (MO).
-- Official MO DOI / SBS lookup was not confirmable from this environment.
-- Website-published license numbers are recorded as claims, not verification.
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
