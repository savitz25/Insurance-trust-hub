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
  countVerifiedMassachusettsProviders,
  countVerifiedMississippiProviders,
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
    } else if (typeof count === 'number') {
      verifiedFlCount = count;
    } else {
      queryError = queryError ?? 'Florida verified count missing';
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

  let byCounty: Awaited<ReturnType<typeof countVerifiedByLaunchCounty>> | null = null;
  let hubTotals: Record<string, number> | null = null;
  let jax: Awaited<ReturnType<typeof getHubInventory>> | null = null;
  let browardInv: Awaited<ReturnType<typeof getHubInventory>> | null = null;
  let verifiedTxCount: number | null = null;
  let verifiedOhCount: number | null = null;
  let verifiedNvCount: number | null = null;
  let verifiedVtCount: number | null = null;
  let verifiedMaCount: number | null = null;
  let verifiedMsCount: number | null = null;
  let inventoryError: string | null = null;
  let profile: Awaited<ReturnType<typeof getProviderBySlug>> | null = null;
  try {
  byCounty = await countVerifiedByLaunchCounty();
  hubTotals = {
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
    boston: await countVerifiedProvidersForHub('boston'),
    worcester: await countVerifiedProvidersForHub('worcester'),
    springfield: await countVerifiedProvidersForHub('springfield'),
    jackson: await countVerifiedProvidersForHub('jackson'),
    'gulfport-biloxi': await countVerifiedProvidersForHub('gulfport-biloxi'),
    hattiesburg: await countVerifiedProvidersForHub('hattiesburg'),
  };

  jax = await getHubInventory('jacksonville', { pageSize: 5 });
  browardInv = await getHubInventory('broward-county', { pageSize: 3 });
  profile = sampleSlug ? await getProviderBySlug(sampleSlug) : null;

  verifiedTxCount = await countVerifiedTexasProviders();
  verifiedOhCount = await countVerifiedOhioProviders();
  verifiedNvCount = await countVerifiedNevadaProviders();
  verifiedVtCount = await countVerifiedVermontProviders();
  verifiedMaCount = await countVerifiedMassachusettsProviders();
  verifiedMsCount = await countVerifiedMississippiProviders();
  } catch (err) {
    const message = err instanceof Error ? err.message : '';
    inventoryError = /unavailable|incomplete/i.test(message)
      ? message.slice(0, 200)
      : 'Hub inventory unavailable';
  }

  const restOk = restStatus === 200 || restStatus === 206;
  const countyOk =
    byCounty != null &&
    byCounty.duval.total > 100 &&
    byCounty.broward.total > 100 &&
    byCounty.miami_dade.total > 100;

  return NextResponse.json(
    {
    ok:
      inventoryError == null &&
      keyMatchesHost &&
      restOk &&
      verifiedFlCount != null &&
      verifiedFlCount > 0 &&
      countyOk &&
      Boolean(profile) &&
      hubTotals != null &&
      hubTotals.jacksonville > 100 &&
      hubTotals['miami-fort-lauderdale'] > 100,
    inventoryError,
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
    verifiedMaCount,
    verifiedMsCount,
    byState: {
      FL: verifiedFlCount,
      TX: verifiedTxCount,
      OH: verifiedOhCount,
      NV: verifiedNvCount,
      VT: verifiedVtCount,
      MA: verifiedMaCount,
      MS: verifiedMsCount,
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
    jacksonville: jax
      ? {
          total: jax.total,
          showing: jax.showing,
          pageSize: jax.pageSize,
          sampleNames: jax.providers.slice(0, 3).map((p) => p.name),
        }
      : null,
    broward: browardInv
      ? {
          total: browardInv.total,
          showing: browardInv.showing,
          pageSize: browardInv.pageSize,
          sampleNames: browardInv.providers.slice(0, 3).map((p) => p.name),
          hubPath: '/hubs/florida/broward-county',
        }
      : null,
    sampleSlug,
    profileResolves: Boolean(profile),
    },
    { headers: { 'Cache-Control': 'no-store, max-age=0' } }
  );
}
