import { NextResponse } from 'next/server';
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from '@/lib/supabase/config';
import { createPublicClient } from '@/lib/supabase/public';
import { getVerifiedProvidersForHub } from '@/lib/dfs/providers-by-county';
import { getProviderBySlug } from '@/lib/providers/queries';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function jwtProjectRef(jwt: string | undefined): string | null {
  if (!jwt) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(jwt.split('.')[1] ?? '', 'base64url').toString('utf8')
    ) as { ref?: string; role?: string };
    return payload.ref ?? null;
  } catch {
    return null;
  }
}

/**
 * Public inventory probe — confirms anon can read DFS-promoted providers.
 * No secrets returned.
 */
export async function GET() {
  const url = getSupabaseUrl();
  const anon = getSupabaseAnonKey();
  const host = (() => {
    if (!url) return null;
    try {
      return new URL(url).host;
    } catch {
      return null;
    }
  })();
  const anonRef = jwtProjectRef(anon);
  const hostRef = host?.split('.')[0] ?? null;
  const keyMatchesHost = Boolean(anonRef && hostRef && anonRef === hostRef);

  if (!isSupabaseConfigured()) {
    return NextResponse.json({
      ok: false,
      supabaseConfigured: false,
      supabaseHost: host,
      anonKeyRef: anonRef,
      keyMatchesHost,
    });
  }

  // Raw REST probe (bypass supabase-js shape)
  let restStatus: number | null = null;
  let restCount: string | null = null;
  let restBodySnippet: string | null = null;
  try {
    const restUrl = `${url!.replace(/\/$/, '')}/rest/v1/providers?select=id&verified=eq.true&limit=1`;
    const res = await fetch(restUrl, {
      headers: {
        apikey: anon!,
        Authorization: `Bearer ${anon}`,
        Prefer: 'count=exact',
        'Range-Unit': 'items',
        Range: '0-0',
      },
      cache: 'no-store',
    });
    restStatus = res.status;
    restCount = res.headers.get('content-range');
    restBodySnippet = (await res.text()).slice(0, 240);
  } catch (e) {
    restBodySnippet = e instanceof Error ? e.message : String(e);
  }

  const supabase = createPublicClient();
  let verifiedFlCount: number | null = null;
  let queryError: string | null = null;
  let sampleSlug: string | null = null;
  let anyProvidersCount: number | null = null;

  if (supabase) {
    const anyRes = await supabase
      .from('providers')
      .select('id', { count: 'exact', head: true });
    anyProvidersCount = anyRes.count ?? null;
    if (anyRes.error) {
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
    }
    sampleSlug = sample?.slug ?? null;
  }

  const jax = await getVerifiedProvidersForHub('jacksonville', { limit: 5 });
  const profile = sampleSlug ? await getProviderBySlug(sampleSlug) : null;

  return NextResponse.json({
    ok:
      keyMatchesHost &&
      restStatus === 200 &&
      (verifiedFlCount ?? 0) > 0 &&
      jax.length > 0,
    supabaseConfigured: true,
    supabaseHost: host,
    anonKeyRef: anonRef,
    keyMatchesHost,
    restStatus,
    restCount,
    restBodySnippet,
    anyProvidersCount,
    verifiedFlCount,
    queryError,
    jacksonvilleSample: jax.length,
    jacksonvilleNames: jax.slice(0, 3).map((p) => p.name),
    sampleSlug,
    profileResolves: Boolean(profile),
  });
}
