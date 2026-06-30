-- =============================================================================
-- Insurance Trust Hub - Production Schema
-- =============================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- -----------------------------------------------------------------------------
-- Custom Types
-- -----------------------------------------------------------------------------

CREATE TYPE provider_type AS ENUM (
  'independent_agent',
  'brokerage',
  'specialist'
);

CREATE TYPE review_status AS ENUM (
  'pending',
  'approved',
  'rejected'
);

-- -----------------------------------------------------------------------------
-- Tables
-- -----------------------------------------------------------------------------

CREATE TABLE providers (
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

CREATE TABLE reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id     UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  author_name     TEXT NOT NULL,
  author_location TEXT,
  rating          INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title           TEXT,
  content         TEXT NOT NULL,
  status          review_status NOT NULL DEFAULT 'pending',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id     UUID REFERENCES providers(id) ON DELETE SET NULL,
  name            TEXT NOT NULL,
  email           TEXT NOT NULL,
  phone           TEXT,
  message         TEXT,
  insurance_types TEXT[] NOT NULL DEFAULT '{}',
  destination     TEXT,
  source          TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE admin_profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  role        TEXT NOT NULL DEFAULT 'admin' CHECK (role = 'admin'),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- Indexes
-- -----------------------------------------------------------------------------

CREATE INDEX idx_providers_slug ON providers(slug);
CREATE INDEX idx_providers_provider_type ON providers(provider_type);
CREATE INDEX idx_providers_verified ON providers(verified) WHERE verified = TRUE;
CREATE INDEX idx_providers_rating ON providers(rating DESC);
CREATE INDEX idx_providers_relocation ON providers(relocation_experience) WHERE relocation_experience = TRUE;
CREATE INDEX idx_providers_categories ON providers USING GIN(categories);
CREATE INDEX idx_providers_states_licensed ON providers USING GIN(states_licensed);
CREATE INDEX idx_providers_cities ON providers USING GIN(cities);
CREATE INDEX idx_providers_specialties ON providers USING GIN(specialties);
CREATE INDEX idx_providers_license_info ON providers USING GIN(license_info);

CREATE INDEX idx_reviews_provider_id ON reviews(provider_id);
CREATE INDEX idx_reviews_status ON reviews(status);
CREATE INDEX idx_reviews_provider_status ON reviews(provider_id, status);
CREATE INDEX idx_reviews_created_at ON reviews(created_at DESC);

CREATE INDEX idx_leads_provider_id ON leads(provider_id);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX idx_leads_insurance_types ON leads USING GIN(insurance_types);

CREATE INDEX idx_admin_profiles_email ON admin_profiles(email);

-- -----------------------------------------------------------------------------
-- Utility Functions
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM admin_profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION update_provider_rating(p_provider_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_avg_rating NUMERIC(3, 2);
  v_review_count INTEGER;
BEGIN
  SELECT
    COALESCE(ROUND(AVG(rating)::NUMERIC, 2), 0),
    COUNT(*)::INTEGER
  INTO v_avg_rating, v_review_count
  FROM reviews
  WHERE provider_id = p_provider_id
    AND status = 'approved';

  UPDATE providers
  SET
    rating = v_avg_rating,
    review_count = v_review_count,
    updated_at = NOW()
  WHERE id = p_provider_id;
END;
$$;

CREATE OR REPLACE FUNCTION handle_review_rating_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'approved' THEN
      PERFORM update_provider_rating(NEW.provider_id);
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status
       OR OLD.rating IS DISTINCT FROM NEW.rating
       OR OLD.provider_id IS DISTINCT FROM NEW.provider_id THEN
      PERFORM update_provider_rating(NEW.provider_id);
      IF OLD.provider_id IS DISTINCT FROM NEW.provider_id THEN
        PERFORM update_provider_rating(OLD.provider_id);
      END IF;
    END IF;
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    PERFORM update_provider_rating(OLD.provider_id);
    RETURN OLD;
  END IF;

  RETURN NULL;
END;
$$;

-- -----------------------------------------------------------------------------
-- Triggers
-- -----------------------------------------------------------------------------

CREATE TRIGGER trg_providers_updated_at
  BEFORE UPDATE ON providers
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_admin_profiles_updated_at
  BEFORE UPDATE ON admin_profiles
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_reviews_rating_change
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW
  EXECUTE FUNCTION handle_review_rating_change();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------

ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

-- Providers: public read verified providers; admin full access
CREATE POLICY "Public can view verified providers"
  ON providers
  FOR SELECT
  TO anon, authenticated
  USING (verified = TRUE);

CREATE POLICY "Admins have full access to providers"
  ON providers
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Reviews: public read approved; public insert pending; admin full access
CREATE POLICY "Public can view approved reviews"
  ON reviews
  FOR SELECT
  TO anon, authenticated
  USING (status = 'approved');

CREATE POLICY "Public can submit reviews"
  ON reviews
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (status = 'pending');

CREATE POLICY "Admins have full access to reviews"
  ON reviews
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Leads: public insert; admin read/update/delete
CREATE POLICY "Public can submit leads"
  ON leads
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (TRUE);

CREATE POLICY "Admins have full access to leads"
  ON leads
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- Admin profiles: admins can read own profile; service role manages inserts
CREATE POLICY "Admins can view own profile"
  ON admin_profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid() AND is_admin());

CREATE POLICY "Admins can update own profile"
  ON admin_profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid() AND is_admin())
  WITH CHECK (id = auth.uid() AND is_admin());

CREATE POLICY "Admins can manage admin profiles"
  ON admin_profiles
  FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- -----------------------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------------------

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON providers TO anon, authenticated;
GRANT SELECT ON reviews TO anon, authenticated;
GRANT INSERT ON reviews TO anon, authenticated;
GRANT INSERT ON leads TO anon, authenticated;

GRANT ALL ON providers TO authenticated;
GRANT ALL ON reviews TO authenticated;
GRANT ALL ON leads TO authenticated;
GRANT ALL ON admin_profiles TO authenticated;

GRANT EXECUTE ON FUNCTION is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_provider_rating(UUID) TO authenticated;