import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

/**
 * Paths that belong to MoveTrustHub / LenderTrustHub — never serve on this host.
 * 301 to the correct network apex so accidental links or residual DNS/alias issues
 * cannot paint Move chrome on insurancetrusthub.com.
 */
const MOVE_ONLY_PREFIXES = [
  '/local-movers',
  '/companies',
  '/auto-transport',
  '/moving-to',
  '/verify-dot',
  '/lender',
  '/from-georgia-to-huntsville',
  '/sitemap-local',
  '/compare',
  '/review',
  '/suggest',
  '/resources/routes',
  '/resources/scams',
  '/insurance', // monorepo-prefixed paths should not exist on apex ITH
] as const;

const MOVE_SITE = 'https://www.movetrusthub.com';
const LENDER_SITE = 'https://www.lendertrusthub.com';

function isMoveOnlyPath(pathname: string): boolean {
  const path = pathname.toLowerCase();
  for (const prefix of MOVE_ONLY_PREFIXES) {
    if (path === prefix || path.startsWith(`${prefix}/`)) return true;
  }
  return false;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isMoveOnlyPath(pathname)) {
    const isLender = pathname === '/lender' || pathname.startsWith('/lender/');
    const base = isLender ? LENDER_SITE : MOVE_SITE;
    // Strip accidental /insurance prefix when bouncing to Move.
    const destPath =
      pathname.startsWith('/insurance/')
        ? pathname.slice('/insurance'.length) || '/'
        : pathname === '/insurance'
          ? '/'
          : pathname;
    const target = new URL(destPath + request.nextUrl.search, base);
    return NextResponse.redirect(target, 301);
  }

  // Admin session refresh only
  if (pathname.startsWith('/admin')) {
    return updateSession(request);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match page navigations; skip static assets and Next internals.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|woff2|woff|ttf|otf|xml|txt|webmanifest)$).*)',
  ],
};
