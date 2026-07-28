-- My Insurance (Insurance HQ) — Phase 1
-- Parallel to MoveTrustHub Save My Move; ITH-owned tables only.

-- Profiles (1:1 with auth.users)
CREATE TABLE IF NOT EXISTS insurance_user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  marketing_opt_in BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS insurance_user_profiles_email_idx
  ON insurance_user_profiles (lower(email));

-- Saved agents / agencies
CREATE TABLE IF NOT EXISTS saved_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider_slug TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, provider_slug)
);

CREATE INDEX IF NOT EXISTS saved_providers_user_id_idx ON saved_providers (user_id);
CREATE INDEX IF NOT EXISTS saved_providers_slug_idx ON saved_providers (provider_slug);

-- Phase 2 scaffolding (empty ready tables)
CREATE TABLE IF NOT EXISTS drug_baskets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My prescriptions',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS drug_basket_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  basket_id UUID NOT NULL REFERENCES drug_baskets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  strength TEXT NOT NULL DEFAULT '',
  form TEXT NOT NULL DEFAULT 'Tablet',
  dosage TEXT NOT NULL DEFAULT '',
  quantity TEXT,
  notes TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS saved_calculator_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calculator_id TEXT NOT NULL,
  title TEXT NOT NULL,
  snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS saved_calculator_results_user_id_idx
  ON saved_calculator_results (user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_insurance_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.insurance_user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', NULL)
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_insurance ON auth.users;
CREATE TRIGGER on_auth_user_created_insurance
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_insurance_user();

-- RLS
ALTER TABLE insurance_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE drug_baskets ENABLE ROW LEVEL SECURITY;
ALTER TABLE drug_basket_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_calculator_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_own" ON insurance_user_profiles;
CREATE POLICY "profiles_select_own" ON insurance_user_profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON insurance_user_profiles;
CREATE POLICY "profiles_update_own" ON insurance_user_profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON insurance_user_profiles;
CREATE POLICY "profiles_insert_own" ON insurance_user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "saved_providers_all_own" ON saved_providers;
CREATE POLICY "saved_providers_all_own" ON saved_providers
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "drug_baskets_all_own" ON drug_baskets;
CREATE POLICY "drug_baskets_all_own" ON drug_baskets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "drug_basket_items_all_own" ON drug_basket_items;
CREATE POLICY "drug_basket_items_all_own" ON drug_basket_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM drug_baskets b
      WHERE b.id = basket_id AND b.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM drug_baskets b
      WHERE b.id = basket_id AND b.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "saved_calculator_results_all_own" ON saved_calculator_results;
CREATE POLICY "saved_calculator_results_all_own" ON saved_calculator_results
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
