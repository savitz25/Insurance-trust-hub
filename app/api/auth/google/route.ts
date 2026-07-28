import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  AUTH_CALLBACK_URL,
  PRODUCTION_SITE_ORIGIN,
  sanitizePostLoginPath,
} from '@/lib/my-insurance/constants';
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
    provider: 'google',
    options: {
      redirectTo,
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  });

  if (error || !data.url) {
    console.error('[auth/google]', error?.message);
    return NextResponse.redirect(
      new URL(`/my-insurance?auth=error&next=${encodeURIComponent(next)}`, PRODUCTION_SITE_ORIGIN)
    );
  }

  return NextResponse.redirect(data.url);
}
