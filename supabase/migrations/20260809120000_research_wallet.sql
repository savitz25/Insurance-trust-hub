-- Phase 11: cross-device research wallet (plan shortlists, doctors, Rx, prefs)
-- Minimal JSON payload; not a claims portal; not lead export.

CREATE TABLE IF NOT EXISTS insurance_research_wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS insurance_research_wallets_updated_at_idx
  ON insurance_research_wallets (updated_at DESC);

ALTER TABLE insurance_research_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "research_wallets_all_own" ON insurance_research_wallets;
CREATE POLICY "research_wallets_all_own" ON insurance_research_wallets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
