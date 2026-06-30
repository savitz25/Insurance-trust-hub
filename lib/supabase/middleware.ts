import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import type { Database } from '@/types/supabase';
import { getAdminSecret, getSupabaseAnonKey, getSupabaseUrl } from '@/lib/supabase/config';

export const ADMIN_COOKIE = 'ith_admin_session';

export function isAdminAuthenticated(request: NextRequest): boolean {
  const secret = getAdminSecret();
  if (!secret) return false;
  return request.cookies.get(ADMIN_COOKIE)?.value === secret;
}

/**
 * Refreshes Supabase auth session cookies and guards /admin routes.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    getSupabaseUrl() ?? 'https://placeholder.supabase.co',
    getSupabaseAnonKey() ?? 'placeholder',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            supabaseResponse.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/admin')) {
    const isLogin = pathname === '/admin/login';
    const isApi = pathname.startsWith('/admin/api');

    if (!isLogin && !isApi && !isAdminAuthenticated(request)) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/admin/login';
      loginUrl.searchParams.set('next', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return supabaseResponse;
}