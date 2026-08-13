-- Phase 21 — My Insurance research sessions (passport, not CRM)
-- Users only read/write their own rows.

CREATE TABLE IF NOT EXISTS research_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title           TEXT NOT NULL,
  source          TEXT NOT NULL
                    CHECK (source IN ('profile', 'hub', 'marketplace', 'compass')),
  provider_slug   TEXT,
  provider_name   TEXT,
  hub_path        TEXT,
  directory_href  TEXT,
  marketplace_zip TEXT,
  planner_href    TEXT,
  resume_href     TEXT NOT NULL,
  note            TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_research_sessions_user
  ON research_sessions (user_id, created_at DESC);

ALTER TABLE research_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "research_sessions_all_own" ON research_sessions;
CREATE POLICY "research_sessions_all_own" ON research_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE research_sessions IS
  'Phase 21 — user research passport sessions; not leads or quote requests';
