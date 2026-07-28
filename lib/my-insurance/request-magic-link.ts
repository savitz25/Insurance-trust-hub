import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import {
  isSupabaseAdminConfigured,
  isSupabaseConfigured,
} from '@/lib/supabase/config';
import {
  AUTH_CALLBACK_URL,
  PRODUCTION_SITE_ORIGIN,
  sanitizePostLoginPath,
} from '@/lib/my-insurance/constants';
import { sendMagicLinkEmail } from '@/lib/my-insurance/emails';

export type RequestMagicLinkResult =
  | { ok: true; delivery: 'resend' | 'supabase' }
  | { ok: false; status: number; error: string };

export async function requestMagicLink(
  emailRaw: string,
  nextRaw?: string | null
): Promise<RequestMagicLinkResult> {
  const email = emailRaw.trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return { ok: false, status: 400, error: 'Enter a valid email address.' };
  }
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      status: 503,
      error: 'Sign-in is not configured yet. Please try again later.',
    };
  }

  const nextPath = sanitizePostLoginPath(nextRaw);

  // Preferred: admin generateLink + Resend
  if (isSupabaseAdminConfigured() && process.env.RESEND_API_KEY?.trim()) {
    try {
      const admin = createAdminClient();
      const redirectTo = `${AUTH_CALLBACK_URL}?next=${encodeURIComponent(nextPath)}`;
      const { data, error } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: { redirectTo },
      });

      if (!error && data?.properties?.hashed_token) {
        const type = data.properties.verification_type || 'magiclink';
        const confirmUrl = new URL(`${PRODUCTION_SITE_ORIGIN}/auth/confirm`);
        confirmUrl.searchParams.set('token_hash', data.properties.hashed_token);
        confirmUrl.searchParams.set('type', type);
        confirmUrl.searchParams.set('next', nextPath);

        const sent = await sendMagicLinkEmail({
          to: email,
          confirmUrl: confirmUrl.toString(),
        });
        if (sent) return { ok: true, delivery: 'resend' };
      } else if (error) {
        console.error('[my-insurance] generateLink', error.message);
      }
    } catch (err) {
      console.error('[my-insurance] Resend magic link path failed', err);
    }
  }

  // Fallback: Supabase built-in OTP mailer
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${AUTH_CALLBACK_URL}?next=${encodeURIComponent(nextPath)}`,
        shouldCreateUser: true,
      },
    });
    if (error) {
      return {
        ok: false,
        status: 500,
        error: error.message.includes('rate')
          ? 'Too many sign-in emails recently. Please wait and try again.'
          : 'Could not send the sign-in link. Please try again shortly.',
      };
    }
    return { ok: true, delivery: 'supabase' };
  } catch (err) {
    console.error('[my-insurance] OTP fallback failed', err);
    return {
      ok: false,
      status: 500,
      error: 'Could not send the sign-in link. Please try again shortly.',
    };
  }
}
