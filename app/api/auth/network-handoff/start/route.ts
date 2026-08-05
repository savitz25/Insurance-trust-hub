import { NextResponse } from 'next/server';
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

function hasAuthCookieHeader(request: Request): boolean {
  const raw = request.headers.get('cookie') || '';
  return /sb-[^=]+-auth-token/.test(raw);
}

function redirectFallback(
  fallback: string,
  reason: string,
  extra?: Record<string, unknown>
) {
  console.warn('[network-handoff/start] skip_code', {
    reason,
    hasAuthCookie: extra?.hasAuthCookie,
    toHub: extra?.toHub,
    error: extra?.error,
  });
  const res = NextResponse.redirect(fallback);
  res.headers.set('x-network-handoff', `skip:${reason}`);
  return res;
}

/**
 * GET /api/auth/network-handoff/start?to=lender&next=/my-lending
 * Session → mint code; no session → plain 307 without code.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const toRaw = (searchParams.get('to') || '').toLowerCase();
  const next = searchParams.get('next');
  const hasAuthCookie = hasAuthCookieHeader(request);

  if (!isNetworkHubId(toRaw) || toRaw === CURRENT_HUB) {
    return NextResponse.redirect(HUB_ORIGINS.insurance);
  }
  const toHub = toRaw as NetworkHubId;

  const fallback = new URL(
    next?.startsWith('/') ? next : HUB_DEFAULT_PATH[toHub],
    HUB_ORIGINS[toHub]
  ).toString();

  if (!isSupabaseConfigured() || !isSupabaseAdminConfigured()) {
    return redirectFallback(fallback, 'no_service_role', { hasAuthCookie, toHub });
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) {
      console.warn('[network-handoff/start] getUser error', {
        message: userError.message,
        hasAuthCookie,
        toHub,
      });
    }

    if (!user) {
      return redirectFallback(fallback, 'no_session', { hasAuthCookie, toHub });
    }

    const result = await createNetworkHandoff({
      userId: user.id,
      fromHub: CURRENT_HUB,
      toHub,
      destinationPath: next,
      ip: clientIp(request),
    });

    if (!result.ok) {
      return redirectFallback(fallback, `create_${result.status}`, {
        hasAuthCookie,
        toHub,
        error: result.error,
      });
    }

    console.info('[network-handoff/start] minted', {
      toHub,
      userId: user.id,
      hasCode: Boolean(result.code),
    });
    const res = NextResponse.redirect(result.redirectUrl);
    res.headers.set('x-network-handoff', 'ok');
    return res;
  } catch (err) {
    console.error('[network-handoff/start] fatal', err);
    return redirectFallback(fallback, 'exception', {
      hasAuthCookie,
      toHub,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
