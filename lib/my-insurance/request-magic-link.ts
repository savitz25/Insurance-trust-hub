import 'server-only';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import {
  isSupabaseAdminConfigured,
  isSupabaseConfigured,
} from '@/lib/supabase/config';
import {
  authExternalRedirectUrl,
  HUB_CANONICAL_ORIGIN,
  sanitizePostLoginPath,
} from '@/lib/my-insurance/constants';
import { sendMagicLinkEmail } from '@/lib/my-insurance/emails';

export type RequestMagicLinkResult =
  | { ok: true; delivery: 'resend' | 'supabase'; emailRedirectTo: string }
  | { ok: false; status: number; error: string };

/**
 * Magic link for Insurance HQ.
 * emailRedirectTo uses Move bridge by default (hub=insurance) so Supabase accepts
 * the redirect; Move forwards the code here without setting a Move session.
 */
export async function requestMagicLink(
  emailRaw: string,
  nextRaw?: string | null,
  _request?: Request | null
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
  const emailRedirectTo = authExternalRedirectUrl(nextPath);

  // Preferred: admin generateLink + Resend with confirm URL on THIS hub
  // (token_hash path never needs Move bridge)
  if (isSupabaseAdminConfigured() && process.env.RESEND_API_KEY?.trim()) {
    try {
      const admin = createAdminClient();
      const { data, error } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email,
        options: {
          // After verify, Supabase may still honor redirectTo — keep hub-scoped
          redirectTo: `${HUB_CANONICAL_ORIGIN}/auth/confirm?next=${encodeURIComponent(nextPath)}`,
        },
      });

      if (!error && data?.properties?.hashed_token) {
        const type = data.properties.verification_type || 'magiclink';
        const confirmUrl = new URL(`${HUB_CANONICAL_ORIGIN}/auth/confirm`);
        confirmUrl.searchParams.set('token_hash', data.properties.hashed_token);
        confirmUrl.searchParams.set('type', type);
        confirmUrl.searchParams.set('next', nextPath);

        const sent = await sendMagicLinkEmail({
          to: email,
          confirmUrl: confirmUrl.toString(),
        });
        if (sent) {
          console.info('[my-insurance] magic-link Resend confirm', confirmUrl.toString());
          return {
            ok: true,
            delivery: 'resend',
            emailRedirectTo: confirmUrl.toString(),
          };
        }
      } else if (error) {
        console.error('[my-insurance] generateLink', error.message);
      }
    } catch (err) {
      console.error('[my-insurance] Resend magic link path failed', err);
    }
  }

  // Supabase mailer — bridge redirect so Site URL allowlist accepts the link
  try {
    console.info('[my-insurance] magic-link emailRedirectTo', emailRedirectTo);
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo,
        shouldCreateUser: true,
      },
    });
    if (error) {
      console.error('[my-insurance] signInWithOtp', error.message, error.code);
      const lower = error.message.toLowerCase();
      if (lower.includes('redirect') || lower.includes('url not allowed')) {
        return {
          ok: false,
          status: 500,
          error:
            'Sign-in redirect is not allow-listed. Add https://www.movetrusthub.com/** and https://www.insurancetrusthub.com/** under Auth → Redirect URLs.',
        };
      }
      return {
        ok: false,
        status: 500,
        error: error.message.includes('rate')
          ? 'Too many sign-in emails recently. Please wait and try again.'
          : 'Could not send the sign-in link. Please try again shortly.',
      };
    }
    return { ok: true, delivery: 'supabase', emailRedirectTo };
  } catch (err) {
    console.error('[my-insurance] OTP fallback failed', err);
    return {
      ok: false,
      status: 500,
      error: 'Could not send the sign-in link. Please try again shortly.',
    };
  }
}
