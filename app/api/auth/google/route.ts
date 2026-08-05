import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  authCallbackUrl,
  resolveSiteOrigin,
  sanitizePostLoginPath,
} from '@/lib/my-insurance/constants';
import {
  ensureInsuranceOAuthUrl,
  insuranceAuthErrorUrl,
} from '@/lib/my-insurance/oauth-redirect';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export async function GET(request: Request) {
  const origin = resolveSiteOrigin(request);

  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(new URL('/my-insurance?auth=error', origin));
  }

  const { searchParams } = new URL(request.url);
  const next = sanitizePostLoginPath(searchParams.get('next'));
  const supabase = await createClient();
  const redirectTo = authCallbackUrl(next, origin);
  console.info('[auth/google] redirectTo', redirectTo);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: { access_type: 'offline', prompt: 'select_account' },
    },
  });

  if (error || !data.url) {
    console.error('[auth/google]', error?.message);
    return NextResponse.redirect(insuranceAuthErrorUrl(next, origin));
  }

  return NextResponse.redirect(ensureInsuranceOAuthUrl(data.url, next, origin));
}
