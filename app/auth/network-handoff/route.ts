import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { EmailOtpType } from '@supabase/supabase-js';
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseAdminConfigured,
  isSupabaseConfigured,
} from '@/lib/supabase/config';
import {
  consumeNetworkHandoff,
  CURRENT_HUB,
  HUB_DEFAULT_PATH,
  HUB_ORIGINS,
  mintSessionTokenHashForUser,
  sanitizeHandoffPath,
} from '@/lib/network/sso-handoff';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function failRedirect(reason: string) {
  const failUrl = new URL(HUB_DEFAULT_PATH.insurance, HUB_ORIGINS.insurance);
  failUrl.searchParams.set('handoff', 'failed');
  failUrl.searchParams.set('reason', reason);
  const res = NextResponse.redirect(failUrl);
  res.headers.set('x-network-handoff', `fail:${reason}`);
  return res;
}

/**
 * Complete SSO handoff on Insurance: consume one-time code, set session cookies, go to HQ.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code') || '';
  const nextHint = searchParams.get('next');

  if (!code || !isSupabaseConfigured()) {
    console.warn('[network-handoff/complete] missing code or supabase config', {
      hasCode: Boolean(code),
    });
    return failRedirect(code ? 'no_supabase' : 'no_code');
  }

  if (!isSupabaseAdminConfigured()) {
    console.error(
      '[network-handoff/complete] SUPABASE_SERVICE_ROLE_KEY missing — cannot mint session'
    );
    return failRedirect('no_service_role');
  }

  const consumed = await consumeNetworkHandoff(code, CURRENT_HUB);
  if (!consumed.ok) {
    console.warn('[network-handoff/complete] consume', consumed.status, consumed.error);
    return failRedirect(`consume_${consumed.status}`);
  }

  const minted = await mintSessionTokenHashForUser(consumed.userId);
  if (!minted.ok) {
    console.warn('[network-handoff/complete] mint', minted.error);
    return failRedirect('mint_failed');
  }

  const destPath = sanitizeHandoffPath(consumed.destinationPath || nextHint, CURRENT_HUB);
  const successUrl = new URL(destPath, HUB_ORIGINS.insurance);
  successUrl.searchParams.set('handoff', 'ok');

  const response = NextResponse.redirect(successUrl);
  const cookieStore = await cookies();
  const url = getSupabaseUrl()!;
  const anon = getSupabaseAnonKey()!;

  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          try {
            cookieStore.set(name, value, options);
          } catch {
            /* ignore */
          }
          response.cookies.set(name, value, {
            ...options,
            path: options?.path ?? '/',
            sameSite: (options?.sameSite as 'lax' | 'strict' | 'none' | undefined) ?? 'lax',
            secure: options?.secure ?? true,
          });
        });
      },
    },
  });

  const { error } = await supabase.auth.verifyOtp({
    type: (minted.type || 'magiclink') as EmailOtpType,
    token_hash: minted.tokenHash,
  });

  if (error) {
    console.error('[network-handoff/complete] verifyOtp', {
      message: error.message,
      status: error.status,
    });
    return failRedirect('otp_failed');
  }

  try {
    await supabase.auth.getUser();
  } catch (e) {
    console.warn('[network-handoff/complete] post-otp getUser', e);
  }

  console.info('[network-handoff/complete] session set on Insurance', {
    path: destPath,
  });
  response.headers.set('x-network-handoff', 'ok');
  return response;
}
