-- Ensure core public inventory table exists before DFS promotion bridge FKs.
-- Safe on empty projects that never applied supabase/schema.sql.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'provider_type') THEN
    CREATE TYPE provider_type AS ENUM (
      'independent_agent',
      'brokerage',
      'specialist'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_status') THEN
    CREATE TYPE review_status AS ENUM (
      'pending',
      'approved',
      'rejected'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS providers (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug                TEXT NOT NULL UNIQUE,
  name                TEXT NOT NULL,
  provider_type       provider_type NOT NULL,
  categories          TEXT[] NOT NULL DEFAULT '{}',
  states_licensed     TEXT[] NOT NULL DEFAULT '{}',
  cities              TEXT[] NOT NULL DEFAULT '{}',
  license_info        JSONB NOT NULL DEFAULT '{}',
  specialties         TEXT[] NOT NULL DEFAULT '{}',
  rating              NUMERIC(3, 2) NOT NULL DEFAULT 0 CHECK (rating >= 0 AND rating <= 5),
  review_count        INTEGER NOT NULL DEFAULT 0 CHECK (review_count >= 0),
  years_in_business   INTEGER CHECK (years_in_business >= 0),
  relocation_experience BOOLEAN NOT NULL DEFAULT FALSE,
  verified            BOOLEAN NOT NULL DEFAULT FALSE,
  description         TEXT,
  short_description   TEXT,
  contact             JSONB NOT NULL DEFAULT '{}',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_providers_slug ON providers(slug);
CREATE INDEX IF NOT EXISTS idx_providers_verified ON providers(verified) WHERE verified = TRUE;
CREATE INDEX IF NOT EXISTS idx_providers_categories ON providers USING GIN(categories);
CREATE INDEX IF NOT EXISTS idx_providers_states_licensed ON providers USING GIN(states_licensed);
CREATE INDEX IF NOT EXISTS idx_providers_cities ON providers USING GIN(cities);
CREATE INDEX IF NOT EXISTS idx_providers_specialties ON providers USING GIN(specialties);
CREATE INDEX IF NOT EXISTS idx_providers_license_info ON providers USING GIN(license_info);

ALTER TABLE providers ENABLE ROW LEVEL SECURITY;

-- Public read of verified rows only (idempotent policy create)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'providers'
      AND policyname = 'Public can view verified providers'
  ) THEN
    CREATE POLICY "Public can view verified providers"
      ON providers
      FOR SELECT
      TO anon, authenticated
      USING (verified = TRUE);
  END IF;
END $$;
