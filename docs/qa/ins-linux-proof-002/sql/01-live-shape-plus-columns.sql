-- INS-LINUX-PROOF-002
-- Isolated role replica plus the proposed nullable publication columns.
-- Do not run this on Production. No production host, project id, or credential
-- is in this file. The local password below is a dummy for this cluster only.

CREATE ROLE anon NOLOGIN NOBYPASSRLS;
CREATE ROLE authenticated NOLOGIN NOBYPASSRLS;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE ROLE proof_app LOGIN PASSWORD 'proof-local-only' NOSUPERUSER NOBYPASSRLS;
GRANT anon, authenticated, service_role TO proof_app;

CREATE TABLE public.providers (
  id uuid PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  verified boolean NOT NULL DEFAULT false,
  states_licensed text[] NOT NULL DEFAULT '{}',
  license_info jsonb,
  contact jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  rating numeric,
  review_count integer,
  publication_county_id text,
  publication_license_ok boolean,
  publication_source_ok boolean,
  publication_identity_accepted boolean,
  publication_bail_excluded boolean,
  publication_license_state text,
  publication_checked_at timestamptz,
  CONSTRAINT providers_publication_license_state_trimmed CHECK (
    publication_license_state IS NULL
    OR (
      publication_license_state = btrim(publication_license_state)
      AND publication_license_state <> ''
    )
  )
);

ALTER TABLE public.providers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view verified providers"
  ON public.providers
  FOR SELECT
  TO anon, authenticated
  USING (verified = true);

GRANT ALL ON public.providers TO anon, authenticated, service_role;

CREATE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
