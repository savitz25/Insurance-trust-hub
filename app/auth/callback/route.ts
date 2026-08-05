import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ensureUserProfile } from '@/lib/my-insurance/ensure-profile';
import {
  HUB_CANONICAL_ORIGIN,
  sanitizePostLoginPath,
} from '@/lib/my-insurance/constants';
import {
  insuranceAuthErrorUrl,
  insuranceAuthSuccessUrl,
} from '@/lib/my-insurance/oauth-redirect';
import { sendWelcomeEmail } from '@/lib/my-insurance/emails';
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from '@/lib/supabase/config';

/**
 * Exchange code and set session cookies on insurancetrusthub.com.
 * Cookies attach to the redirect response so the session sticks.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = sanitizePostLoginPath(searchParams.get('next'));
  const oauthError = searchParams.get('error');

  if (oauthError) {
    console.error('[auth/callback] provider error', oauthError);
    return NextResponse.redirect(insuranceAuthErrorUrl(next));
  }

  if (!code || !isSupabaseConfigured()) {
    return NextResponse.redirect(insuranceAuthErrorUrl(next));
  }

  const successUrl = insuranceAuthSuccessUrl(next, HUB_CANONICAL_ORIGIN);
  const errorUrl = insuranceAuthErrorUrl(next, HUB_CANONICAL_ORIGIN);
  const response = NextResponse.redirect(successUrl);
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

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error('[auth/callback] exchange failed', error.message);
    return NextResponse.redirect(errorUrl);
  }

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      await ensureUserProfile(supabase, user);
      if (user.email) {
        void sendWelcomeEmail({ to: user.email }).catch(() => undefined);
      }
    }
  } catch (err) {
    console.error('[auth/callback] profile', err);
  }

  console.info('[auth/callback] session set on Insurance', { next });
  return response;
}
