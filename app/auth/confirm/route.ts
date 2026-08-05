import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ensureUserProfile } from '@/lib/my-insurance/ensure-profile';
import {
  MY_INSURANCE_PATH,
  resolveSiteOrigin,
  sanitizePostLoginPath,
} from '@/lib/my-insurance/constants';
import { sendWelcomeEmail } from '@/lib/my-insurance/emails';
import type { EmailOtpType } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const origin = resolveSiteOrigin(request);
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get('token_hash');
  const type = (searchParams.get('type') || 'magiclink') as EmailOtpType;
  const next = sanitizePostLoginPath(searchParams.get('next'));

  const fail = new URL(`${MY_INSURANCE_PATH}?auth=error`, origin);

  if (!token_hash) {
    return NextResponse.redirect(fail);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash, type });
  if (error) {
    console.error('[auth/confirm]', error.message);
    return NextResponse.redirect(fail);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    try {
      await ensureUserProfile(supabase, user);
      if (user.email) {
        void sendWelcomeEmail({ to: user.email }).catch(() => undefined);
      }
    } catch (err) {
      console.error('[auth/confirm] profile', err);
    }
  }

  return NextResponse.redirect(new URL(next, origin));
}
