-- My Insurance Phase 3: comparisons + reviews
-- Safe after 20260728120000_my_insurance.sql
-- Works whether or not the full Insurance directory schema was applied.

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

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'review_status') THEN
    CREATE TYPE review_status AS ENUM ('pending', 'approved', 'rejected');
  END IF;
END $$;

DO $$
BEGIN
  IF to_regclass('public.reviews') IS NOT NULL THEN
    RETURN;
  END IF;

  IF to_regclass('public.providers') IS NOT NULL THEN
    CREATE TABLE public.reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      provider_id UUID NOT NULL REFERENCES public.providers(id) ON DELETE CASCADE,
      author_name TEXT NOT NULL,
      author_location TEXT,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      title TEXT,
      content TEXT NOT NULL,
      status review_status NOT NULL DEFAULT 'pending',
      user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      coverage_type TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  ELSE
    CREATE TABLE public.reviews (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      provider_id UUID NOT NULL,
      author_name TEXT NOT NULL,
      author_location TEXT,
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      title TEXT,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'approved', 'rejected', 'published', 'hidden')),
      user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      coverage_type TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  END IF;
END $$;

ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.reviews ADD COLUMN IF NOT EXISTS coverage_type TEXT;

CREATE INDEX IF NOT EXISTS idx_reviews_provider_id ON public.reviews (provider_id);
CREATE INDEX IF NOT EXISTS idx_reviews_status ON public.reviews (status);
CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON public.reviews (created_at DESC);
CREATE INDEX IF NOT EXISTS reviews_user_id_idx ON public.reviews (user_id)
  WHERE user_id IS NOT NULL;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view approved reviews" ON public.reviews;
CREATE POLICY "Public can view approved reviews"
  ON public.reviews
  FOR SELECT
  USING (status::text IN ('approved', 'published'));

DROP POLICY IF EXISTS "reviews_select_own" ON public.reviews;
CREATE POLICY "reviews_select_own" ON public.reviews
  FOR SELECT USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

DROP POLICY IF EXISTS "reviews_insert_authenticated" ON public.reviews;
CREATE POLICY "reviews_insert_authenticated" ON public.reviews
  FOR INSERT
  WITH CHECK (
    auth.uid() IS NOT NULL
    AND (user_id IS NULL OR user_id = auth.uid())
  );

DROP POLICY IF EXISTS "reviews_update_own" ON public.reviews;
CREATE POLICY "reviews_update_own" ON public.reviews
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "reviews_delete_own" ON public.reviews;
CREATE POLICY "reviews_delete_own" ON public.reviews
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can submit reviews" ON public.reviews;
CREATE POLICY "Public can submit reviews"
  ON public.reviews
  FOR INSERT
  WITH CHECK (user_id IS NULL AND status::text = 'pending');
