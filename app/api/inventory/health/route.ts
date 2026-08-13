import { NextResponse } from 'next/server';
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from '@/lib/supabase/config';
import { createPublicClient } from '@/lib/supabase/public';
import {
  countVerifiedByLaunchCounty,
  countVerifiedOhioProviders,
  countVerifiedTexasProviders,
  countVerifiedNevadaProviders,
  countVerifiedVermontProviders,
  countVerifiedProvidersForHub,
  getHubInventory,
  HUB_PAGE_SIZE,
} from '@/lib/dfs/providers-by-county';
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
 * Public inventory probe — env match + county match totals.
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

  if (supabase) {
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

  const byCounty = await countVerifiedByLaunchCounty();
  const hubTotals = {
    jacksonville: await countVerifiedProvidersForHub('jacksonville'),
    'miami-dade': await countVerifiedProvidersForHub('miami-dade'),
    broward: await countVerifiedProvidersForHub('broward-county'),
    'broward-county': await countVerifiedProvidersForHub('broward-county'),
    'palm-beach-county': await countVerifiedProvidersForHub('palm-beach-county'),
    tampa: await countVerifiedProvidersForHub('tampa'),
    orlando: await countVerifiedProvidersForHub('orlando'),
    'miami-fort-lauderdale': await countVerifiedProvidersForHub(
      'miami-fort-lauderdale'
    ),
    columbus: await countVerifiedProvidersForHub('columbus'),
    cleveland: await countVerifiedProvidersForHub('cleveland'),
    cincinnati: await countVerifiedProvidersForHub('cincinnati'),
    houston: await countVerifiedProvidersForHub('houston'),
    'las-vegas': await countVerifiedProvidersForHub('las-vegas'),
    burlington: await countVerifiedProvidersForHub('burlington'),
  };

  const jax = await getHubInventory('jacksonville', { pageSize: 5 });
  const browardInv = await getHubInventory('broward-county', { pageSize: 3 });
  const profile = sampleSlug ? await getProviderBySlug(sampleSlug) : null;

  const verifiedTxCount = await countVerifiedTexasProviders();
  const verifiedOhCount = await countVerifiedOhioProviders();
  const verifiedNvCount = await countVerifiedNevadaProviders();
  const verifiedVtCount = await countVerifiedVermontProviders();

  const restOk = restStatus === 200 || restStatus === 206;
  const countyOk =
    (byCounty.duval?.total ?? 0) > 100 &&
    (byCounty.broward?.total ?? 0) > 100 &&
    (byCounty.miami_dade?.total ?? 0) > 100;

  return NextResponse.json(
    {
    ok:
      keyMatchesHost &&
      restOk &&
      (verifiedFlCount ?? 0) > 0 &&
      countyOk &&
      Boolean(profile) &&
      hubTotals.jacksonville > 100 &&
      hubTotals['miami-fort-lauderdale'] > 100,
    supabaseConfigured: true,
    supabaseHost: host,
    anonKeyRef: anonRef,
    keyMatchesHost,
    restStatus,
    restCount,
    restBodySnippet,
    verifiedFlCount,
    verifiedTxCount,
    verifiedOhCount,
    verifiedNvCount,
    verifiedVtCount,
    byState: {
      FL: verifiedFlCount,
      TX: verifiedTxCount,
      OH: verifiedOhCount,
      NV: verifiedNvCount,
      VT: verifiedVtCount,
    },
    queryError,
    /** Matching strategy + intentional page cap */
    matching: {
      strategy:
        'structured contact.county/launch_county_id when present; else short_description "(X County)" tags from DFS promote; Phase 1 verified-only',
      hubPageSize: HUB_PAGE_SIZE,
      note: 'Hub hero/SEO totals use exact match count; cards show first hubPageSize rows with explicit showing X of Y',
    },
    byLaunchCounty: byCounty,
    hubTotals,
    jacksonville: {
      total: jax.total,
      showing: jax.showing,
      pageSize: jax.pageSize,
      sampleNames: jax.providers.slice(0, 3).map((p) => p.name),
    },
    broward: {
      total: browardInv.total,
      showing: browardInv.showing,
      pageSize: browardInv.pageSize,
      sampleNames: browardInv.providers.slice(0, 3).map((p) => p.name),
      hubPath: '/hubs/florida/broward-county',
    },
    sampleSlug,
    profileResolves: Boolean(profile),
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}
