import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  authExternalRedirectUrl,
  HUB_CANONICAL_ORIGIN,
  sanitizePostLoginPath,
} from '@/lib/my-insurance/constants';
import {
  ensureInsuranceOAuthUrl,
  insuranceAuthErrorUrl,
} from '@/lib/my-insurance/oauth-redirect';
import { isSupabaseConfigured } from '@/lib/supabase/config';

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.redirect(
      new URL('/my-insurance?auth=error', HUB_CANONICAL_ORIGIN)
    );
  }

  const { searchParams } = new URL(request.url);
  const next = sanitizePostLoginPath(searchParams.get('next'));
  const supabase = await createClient();
  const redirectTo = authExternalRedirectUrl(next);
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
    return NextResponse.redirect(insuranceAuthErrorUrl(next));
  }

  return NextResponse.redirect(ensureInsuranceOAuthUrl(data.url, next));
}
