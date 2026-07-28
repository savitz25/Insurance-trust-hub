import { createServerClient } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import {
  getSupabaseAnonKey,
  getSupabaseUrl,
  getAdminSecret,
  isSupabaseConfigured,
} from '@/lib/supabase/config';

export const ADMIN_COOKIE = 'ith_admin_session';

export function isAdminAuthenticated(request: NextRequest): boolean {
  const secret = getAdminSecret();
  if (!secret) return false;
  return request.cookies.get(ADMIN_COOKIE)?.value === secret;
}

/** True when Supabase auth cookies are present (skip refresh on pure public traffic). */
function hasSupabaseAuthCookies(request: NextRequest): boolean {
  return request.cookies.getAll().some(
    (c) => c.name.includes('auth-token') || c.name.startsWith('sb-')
  );
}

/**
 * Middleware session helper:
 * - Admin cookie guard for /admin/*
 * - Supabase cookie refresh when auth session cookies exist
 */
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Admin routes: shared-secret cookie (not Supabase Auth)
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login' || pathname.startsWith('/admin/api/login')) {
      return NextResponse.next();
    }
    if (!isAdminAuthenticated(request)) {
      const login = request.nextUrl.clone();
      login.pathname = '/admin/login';
      login.searchParams.set('next', pathname);
      return NextResponse.redirect(login);
    }
    return NextResponse.next();
  }

  // Public: refresh Supabase session only when cookies exist
  if (!isSupabaseConfigured() || !hasSupabaseAuthCookies(request)) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(getSupabaseUrl()!, getSupabaseAnonKey()!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({
          request: { headers: request.headers },
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  await supabase.auth.getUser();
  return response;
}
