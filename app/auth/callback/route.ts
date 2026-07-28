import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ensureUserProfile } from '@/lib/my-insurance/ensure-profile';
import { sanitizePostLoginPath } from '@/lib/my-insurance/constants';
import {
  insuranceAuthErrorUrl,
  insuranceAuthSuccessUrl,
} from '@/lib/my-insurance/oauth-redirect';
import { sendWelcomeEmail } from '@/lib/my-insurance/emails';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const next = sanitizePostLoginPath(searchParams.get('next'));
  const oauthError = searchParams.get('error');

  if (oauthError) {
    console.error('[auth/callback] provider error', oauthError);
    return NextResponse.redirect(insuranceAuthErrorUrl(next));
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
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
          console.error('[auth/callback] profile', err);
        }
      }
      return NextResponse.redirect(insuranceAuthSuccessUrl(next));
    }
    console.error('[auth/callback] exchange failed', error.message);
  }

  return NextResponse.redirect(insuranceAuthErrorUrl(next));
}
