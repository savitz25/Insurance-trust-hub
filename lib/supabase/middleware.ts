import { type NextRequest, NextResponse } from 'next/server';
import { getAdminSecret } from '@/lib/supabase/config';

export const ADMIN_COOKIE = 'ith_admin_session';

export function isAdminAuthenticated(request: NextRequest): boolean {
  const secret = getAdminSecret();
  if (!secret) return false;
  return request.cookies.get(ADMIN_COOKIE)?.value === secret;
}

/** Guards /admin routes behind the ADMIN_SECRET cookie. */
export function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLogin = pathname === '/admin/login';
  const isApi = pathname.startsWith('/admin/api');

  if (!isLogin && !isApi && !isAdminAuthenticated(request)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/admin/login';
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}