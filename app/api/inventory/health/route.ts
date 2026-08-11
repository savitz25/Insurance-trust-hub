import { NextResponse } from 'next/server';
import { getSupabaseUrl, isSupabaseConfigured } from '@/lib/supabase/config';
import { createPublicClient } from '@/lib/supabase/public';
import { getVerifiedProvidersForHub } from '@/lib/dfs/providers-by-county';
import { getProviderBySlug } from '@/lib/providers/queries';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Public inventory probe — confirms anon can read DFS-promoted providers.
 * No secrets returned.
 */
export async function GET() {
  const host = (() => {
    const url = getSupabaseUrl();
    if (!url) return null;
    try {
      return new URL(url).host;
    } catch {
      return null;
    }
  })();

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: false,
      supabaseConfigured: false,
      supabaseHost: host,
    });
  }

  const supabase = createPublicClient();
  let verifiedFlCount: number | null = null;
  let queryError: string | null = null;
  let sampleSlug: string | null = null;

  let rawError: unknown = null;
  let anyProvidersCount: number | null = null;

  if (supabase) {
    const anyRes = await supabase
      .from('providers')
      .select('id', { count: 'exact', head: true });
    anyProvidersCount = anyRes.count ?? null;
    if (anyRes.error) {
      rawError = anyRes.error;
      queryError =
        anyRes.error.message ||
        anyRes.error.code ||
        JSON.stringify(anyRes.error);
    }

    const { count, error } = await supabase
      .from('providers')
      .select('id', { count: 'exact', head: true })
      .eq('verified', true)
      .contains('states_licensed', ['FL']);
    if (error) {
      rawError = error;
      queryError =
        error.message || error.code || JSON.stringify(error) || queryError;
    } else {
      verifiedFlCount = count ?? 0;
    }

    const { data: sample, error: sampleErr } = await supabase
      .from('providers')
      .select('slug')
      .eq('verified', true)
      .contains('states_licensed', ['FL'])
      .ilike('short_description', '%Duval%')
      .limit(1)
      .maybeSingle();
    if (sampleErr && !queryError) {
      queryError =
        sampleErr.message || sampleErr.code || JSON.stringify(sampleErr);
      rawError = sampleErr;
    }
    sampleSlug = sample?.slug ?? null;
  }

  const jax = await getVerifiedProvidersForHub('jacksonville', { limit: 5 });
  const profile = sampleSlug ? await getProviderBySlug(sampleSlug) : null;

  return NextResponse.json({
    ok: !queryError && (verifiedFlCount ?? 0) > 0 && jax.length > 0,
    supabaseConfigured: true,
    supabaseHost: host,
    anyProvidersCount,
    verifiedFlCount,
    queryError,
    errorCode:
      rawError && typeof rawError === 'object' && rawError !== null
        ? (rawError as { code?: string }).code ?? null
        : null,
    jacksonvilleSample: jax.length,
    jacksonvilleNames: jax.slice(0, 3).map((p) => p.name),
    sampleSlug,
    profileResolves: Boolean(profile),
  });
}
