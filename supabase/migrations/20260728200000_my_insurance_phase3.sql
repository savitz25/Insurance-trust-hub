-- My Insurance Phase 3: comparisons + auth-linked review fields
-- Additive only. Safe to run after 20260728120000_my_insurance.sql

CREATE TABLE IF NOT EXISTS provider_comparisons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Agent comparison',
  snapshot_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS provider_comparisons_user_id_idx
  ON provider_comparisons (user_id);

CREATE TABLE IF NOT EXISTS provider_comparison_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comparison_id UUID NOT NULL REFERENCES provider_comparisons(id) ON DELETE CASCADE,
  provider_slug TEXT NOT NULL,
  provider_name TEXT NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (comparison_id, provider_slug)
);

CREATE INDEX IF NOT EXISTS provider_comparison_items_comparison_id_idx
  ON provider_comparison_items (comparison_id);

ALTER TABLE provider_comparisons ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_comparison_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "provider_comparisons_all_own" ON provider_comparisons;
CREATE POLICY "provider_comparisons_all_own" ON provider_comparisons
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "provider_comparison_items_all_own" ON provider_comparison_items;
CREATE POLICY "provider_comparison_items_all_own" ON provider_comparison_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM provider_comparisons c
      WHERE c.id = comparison_id AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM provider_comparisons c
      WHERE c.id = comparison_id AND c.user_id = auth.uid()
    )
  );

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS coverage_type TEXT;

CREATE INDEX IF NOT EXISTS reviews_user_id_idx ON reviews (user_id)
  WHERE user_id IS NOT NULL;

DROP POLICY IF EXISTS "reviews_select_own" ON reviews;
CREATE POLICY "reviews_select_own" ON reviews
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "reviews_insert_authenticated" ON reviews;
CREATE POLICY "reviews_insert_authenticated" ON reviews
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
    AND (user_id IS NULL OR user_id = auth.uid())
  );

DROP POLICY IF EXISTS "reviews_update_own" ON reviews;
CREATE POLICY "reviews_update_own" ON reviews
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
