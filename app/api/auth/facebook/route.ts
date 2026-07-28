import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  AUTH_CALLBACK_URL,
  PRODUCTION_SITE_ORIGIN,
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
      new URL('/my-insurance?auth=error', PRODUCTION_SITE_ORIGIN)
    );
  }

  const { searchParams } = new URL(request.url);
  const next = sanitizePostLoginPath(searchParams.get('next'));
  const supabase = await createClient();
  const redirectTo = `${AUTH_CALLBACK_URL}?next=${encodeURIComponent(next)}`;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: { redirectTo },
  });

  if (error || !data.url) {
    console.error('[auth/facebook]', error?.message);
    return NextResponse.redirect(insuranceAuthErrorUrl(next));
  }

  return NextResponse.redirect(ensureInsuranceOAuthUrl(data.url, next));
}
