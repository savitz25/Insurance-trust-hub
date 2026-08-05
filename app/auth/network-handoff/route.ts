import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { EmailOtpType } from '@supabase/supabase-js';
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from '@/lib/supabase/config';
import {
  consumeNetworkHandoff,
  CURRENT_HUB,
  HUB_DEFAULT_PATH,
  HUB_ORIGINS,
  mintSessionTokenHashForUser,
  sanitizeHandoffPath,
} from '@/lib/network/network-handoff';

/**
 * Complete SSO handoff on Insurance: consume one-time code, set session cookies, go to HQ.
 * Soft failure → logged-out HQ (no panic).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code') || '';
  const nextHint = searchParams.get('next');

  // Prefer clean HQ on soft fail
  const failUrl = new URL(HUB_DEFAULT_PATH.insurance, HUB_ORIGINS.insurance);
  failUrl.searchParams.set('handoff', 'failed');

  if (!code || !isSupabaseConfigured()) {
    return NextResponse.redirect(failUrl);
  }

  const consumed = await consumeNetworkHandoff(code, CURRENT_HUB);
  if (!consumed.ok) {
    console.warn('[network-handoff/complete]', consumed.status, consumed.error);
    return NextResponse.redirect(failUrl);
  }

  const minted = await mintSessionTokenHashForUser(consumed.userId);
  if (!minted.ok) {
    console.warn('[network-handoff/complete] mint', minted.error);
    return NextResponse.redirect(failUrl);
  }

  const destPath = sanitizeHandoffPath(consumed.destinationPath || nextHint, CURRENT_HUB);
  const successUrl = new URL(destPath, HUB_ORIGINS.insurance);
  successUrl.searchParams.set('handoff', 'ok');

  let response = NextResponse.redirect(successUrl);
  const cookieStore = await cookies();

  const supabase = createServerClient(getSupabaseUrl()!, getSupabaseAnonKey()!, {
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
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const { error } = await supabase.auth.verifyOtp({
    type: (minted.type || 'magiclink') as EmailOtpType,
    token_hash: minted.tokenHash,
  });

  if (error) {
    console.error('[network-handoff/complete] verifyOtp', error.message);
    return NextResponse.redirect(failUrl);
  }

  console.info('[network-handoff/complete] session set on Insurance', {
    path: destPath,
  });
  return response;
}
