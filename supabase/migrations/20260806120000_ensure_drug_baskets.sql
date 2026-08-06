-- Ensure My Insurance drug basket tables + RLS exist (idempotent).
-- Safe to re-run on Insurance Supabase project if Phase 1 migration was skipped.

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

CREATE INDEX IF NOT EXISTS drug_baskets_user_id_idx ON drug_baskets (user_id);
CREATE INDEX IF NOT EXISTS drug_basket_items_basket_id_idx ON drug_basket_items (basket_id);

ALTER TABLE drug_baskets ENABLE ROW LEVEL SECURITY;
ALTER TABLE drug_basket_items ENABLE ROW LEVEL SECURITY;

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
