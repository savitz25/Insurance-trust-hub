import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@/lib/supabase/server';
import {
  createNetworkHandoff,
  CURRENT_HUB,
  HUB_DEFAULT_PATH,
  HUB_ORIGINS,
  isNetworkHubId,
  type NetworkHubId,
} from '@/lib/network/sso-handoff';
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseAdminConfigured,
  isSupabaseConfigured,
} from '@/lib/supabase/config';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function clientIp(request: Request): string | null {
  return (
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null
  );
}

function hasAuthCookie(request: Request): boolean {
  return /sb-[^=;\s]+-auth-token/.test(request.headers.get('cookie') || '');
}

function bearerFrom(request: Request, bodyToken?: string | null): string | null {
  if (bodyToken?.trim()) return bodyToken.trim();
  const h = request.headers.get('authorization') || '';
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m?.[1]?.trim() || null;
}

async function resolveUserId(
  request: Request,
  bearer: string | null
): Promise<string | null> {
  const url = getSupabaseUrl();
  const anon = getSupabaseAnonKey();
  if (!url || !anon) return null;

  if (bearer && bearer.length > 20) {
    const supabase = createServerClient(url, anon, {
      cookies: { getAll: () => [], setAll: () => {} },
    });
    const { data, error } = await supabase.auth.getUser(bearer);
    if (!error && data.user) return data.user.id;
  }

  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

async function runStart(
  request: Request,
  toRaw: string,
  next: string | null,
  bearer: string | null
) {
  const hasCookie = hasAuthCookie(request);
  const hasBearer = Boolean(bearer && bearer.length > 20);

  if (!isNetworkHubId(toRaw) || toRaw === CURRENT_HUB) {
    return {
      ok: false as const,
      reason: 'bad_target',
      fallbackUrl: HUB_ORIGINS.insurance,
      hasCookie,
      hasBearer,
    };
  }
  const toHub = toRaw as NetworkHubId;
  if (toHub === 'senior' || toHub === 'investor' || toHub === 'ask') {
    const direct = new URL(
      next?.startsWith('/') ? next : HUB_DEFAULT_PATH[toHub],
      HUB_ORIGINS[toHub]
    ).toString();
    return {
      ok: false as const,
      reason: 'direct_navigation',
      fallbackUrl: direct,
      hasCookie,
      hasBearer,
      toHub,
    };
  }
  const fallbackUrl = new URL(
    next?.startsWith('/') ? next : HUB_DEFAULT_PATH[toHub],
    HUB_ORIGINS[toHub]
  ).toString();

  if (!isSupabaseConfigured() || !isSupabaseAdminConfigured()) {
    return {
      ok: false as const,
      reason: 'no_service_role',
      fallbackUrl,
      hasCookie,
      hasBearer,
      toHub,
    };
  }

  const userId = await resolveUserId(request, bearer);
  if (!userId) {
    return {
      ok: false as const,
      reason: 'no_session',
      fallbackUrl,
      hasCookie,
      hasBearer,
      toHub,
    };
  }

  const result = await createNetworkHandoff({
    userId,
    fromHub: CURRENT_HUB,
    toHub,
    destinationPath: next,
    ip: clientIp(request),
  });

  if (!result.ok) {
    return {
      ok: false as const,
      reason: `create_${result.status}`,
      fallbackUrl,
      hasCookie,
      hasBearer,
      toHub,
      error: result.error,
    };
  }

  return {
    ok: true as const,
    reason: 'minted',
    redirectUrl: result.redirectUrl,
    toHub,
    hasCookie,
    hasBearer,
  };
}

function headersFor(
  res: NextResponse,
  result: Awaited<ReturnType<typeof runStart>>
) {
  if (result.ok) {
    res.headers.set('x-network-handoff', 'ok');
  } else {
    res.headers.set('x-network-handoff', `skip:${result.reason}`);
    res.headers.set('x-network-handoff-cookie', result.hasCookie ? '1' : '0');
    res.headers.set('x-network-handoff-bearer', result.hasBearer ? '1' : '0');
  }
  return res;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const result = await runStart(
    request,
    searchParams.get('to') || '',
    searchParams.get('next'),
    bearerFrom(request)
  );

  if (result.ok) {
    return headersFor(NextResponse.redirect(result.redirectUrl), result);
  }
  console.warn('[network-handoff/start] skip_code', result);
  return headersFor(NextResponse.redirect(result.fallbackUrl), result);
}

export async function POST(request: Request) {
  let body: { to?: string; next?: string; access_token?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    body = {};
  }
  const result = await runStart(
    request,
    body.to || '',
    body.next ?? null,
    bearerFrom(request, body.access_token)
  );

  if (result.ok) {
    return headersFor(
      NextResponse.json({
        ok: true,
        reason: 'minted',
        redirectUrl: result.redirectUrl,
        toHub: result.toHub,
      }),
      result
    );
  }

  console.warn('[network-handoff/start] POST skip_code', result);
  return headersFor(
    NextResponse.json(
      {
        ok: false,
        reason: result.reason,
        fallbackUrl: result.fallbackUrl,
        hasAuthCookie: result.hasCookie,
        hasBearer: result.hasBearer,
        error: 'error' in result ? result.error : null,
      },
      { status: result.reason === 'no_session' ? 401 : 400 }
    ),
    result
  );
}
