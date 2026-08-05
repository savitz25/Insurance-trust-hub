import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ensureUserProfile } from '@/lib/my-insurance/ensure-profile';
import {
  HUB_CANONICAL_ORIGIN,
  MY_INSURANCE_PATH,
  sanitizePostLoginPath,
} from '@/lib/my-insurance/constants';
import { sendWelcomeEmail } from '@/lib/my-insurance/emails';
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from '@/lib/supabase/config';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = (searchParams.get('type') || 'magiclink') as EmailOtpType;
  const next = sanitizePostLoginPath(searchParams.get('next'));

  const fail = new URL(`${MY_INSURANCE_PATH}?auth=error`, HUB_CANONICAL_ORIGIN);
  const success = new URL(next, HUB_CANONICAL_ORIGIN);

  if (!token_hash || !isSupabaseConfigured()) {
    return NextResponse.redirect(fail);
  }

  const response = NextResponse.redirect(success);
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

  const { error } = await supabase.auth.verifyOtp({ token_hash, type });
  if (error) {
    console.error('[auth/confirm]', error.message);
    return NextResponse.redirect(fail);
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
    console.error('[auth/confirm] profile', err);
  }

  return response;
}
