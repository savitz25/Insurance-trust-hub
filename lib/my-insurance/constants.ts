import { SITE_URL } from '@/lib/constants';

export const MY_INSURANCE_PATH = '/my-insurance';
export const AUTH_CALLBACK_PATH = '/auth/callback';
export const AUTH_CONFIRM_PATH = '/auth/confirm';

/** Canonical production origin for this hub — never movetrusthub.com */
export const HUB_CANONICAL_ORIGIN = 'https://www.insurancetrusthub.com';
const HUB_HOST_FRAGMENT = 'insurancetrusthub.com';

/**
 * Shared Supabase Site URL host. Used as OAuth/magic bridge when redirect
 * allow-list only has Move — Move hands code off here without exchanging.
 */
export const MOVE_AUTH_BRIDGE =
  process.env.MOVE_AUTH_BRIDGE_URL?.trim() ||
  'https://www.movetrusthub.com/auth/callback';

export function useDirectAuthRedirect(): boolean {
  return process.env.AUTH_OAUTH_DIRECT === '1' || process.env.AUTH_OAUTH_DIRECT === 'true';
}

/**
 * Origin for post-login on THIS hub. Canonical www in production.
 */
export function resolveSiteOrigin(request?: Request | null): string {
  if (request && process.env.NODE_ENV === 'development') {
    const hostRaw = (
      request.headers.get('x-forwarded-host') ||
      request.headers.get('host') ||
      ''
    )
      .split(',')[0]
      .trim()
      .toLowerCase();
    if (hostRaw.startsWith('localhost') || hostRaw.startsWith('127.0.0.1')) {
      const proto = (
        request.headers.get('x-forwarded-proto') ||
        'http'
      )
        .split(',')[0]
        .trim();
      return `${proto}://${hostRaw}`.replace(/\/$/, '');
    }
  }

  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  if (env) {
    try {
      if (new URL(env).hostname.toLowerCase().includes(HUB_HOST_FRAGMENT)) {
        if (env.includes('insurancetrusthub.com') && !env.includes('localhost')) {
          return HUB_CANONICAL_ORIGIN;
        }
        return env;
      }
      console.warn(
        '[auth] NEXT_PUBLIC_SITE_URL is not an Insurance host; using canonical',
        env
      );
    } catch {
      /* ignore */
    }
  }

  return HUB_CANONICAL_ORIGIN;
}

/** Static site origin for emails / SEO — Insurance only. */
export const PRODUCTION_SITE_ORIGIN = (() => {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  if (env) {
    try {
      if (new URL(env).hostname.toLowerCase().includes(HUB_HOST_FRAGMENT)) {
        return HUB_CANONICAL_ORIGIN;
      }
    } catch {
      /* ignore */
    }
  }
  return SITE_URL.replace(/\/$/, '') || HUB_CANONICAL_ORIGIN;
})();

/**
 * Supabase emailRedirectTo / OAuth redirectTo.
 * Default: Move bridge with hub=insurance (allowlisted Site URL).
 * AUTH_OAUTH_DIRECT=1 → this hub’s /auth/callback only.
 */
export function authExternalRedirectUrl(nextPath: string): string {
  const next = sanitizePostLoginPath(nextPath);
  if (useDirectAuthRedirect()) {
    return `${HUB_CANONICAL_ORIGIN}${AUTH_CALLBACK_PATH}?next=${encodeURIComponent(next)}&hub=insurance`;
  }
  const bridge = new URL(MOVE_AUTH_BRIDGE);
  bridge.searchParams.set('next', next);
  bridge.searchParams.set('hub', 'insurance');
  return bridge.toString();
}

export function authCallbackUrl(nextPath: string, origin?: string): string {
  const base = (origin || HUB_CANONICAL_ORIGIN).replace(/\/$/, '');
  const next = sanitizePostLoginPath(nextPath);
  return `${base}${AUTH_CALLBACK_PATH}?next=${encodeURIComponent(next)}&hub=insurance`;
}

export const AUTH_CALLBACK_URL = `${HUB_CANONICAL_ORIGIN}${AUTH_CALLBACK_PATH}`;

export const GUEST_SAVED_PROVIDERS_KEY = 'ith-my-insurance-saved-providers-v1';
/** Spec storage key for CoveragePlan + SavedProvider blob */
export const MY_INSURANCE_STORE_KEY = 'ith:my-insurance:v1';
/** Pre-spec key; still read once then rewritten to MY_INSURANCE_STORE_KEY */
export const MY_INSURANCE_STORE_KEY_LEGACY = 'ith-my-insurance-store-v1';
export const PENDING_SAVE_ACTION_KEY = 'ith-my-insurance-pending-action-v1';
export const POST_LOGIN_REDIRECT_KEY = 'ith-my-insurance-post-login-redirect';

export const DRUG_BASKET_PATH = '/tools/prescription-drug-list';
export const ACA_SUBSIDY_PATH = '/calculators/aca-subsidy';
export const COST_ESTIMATOR_PATH = '/tools/cost-estimator';
export const COMPARE_PATH = '/my-insurance/compare';
export const COMPARE_TRAY_KEY = 'ith-my-insurance-compare-tray-v1';
export const MAX_COMPARE_PROVIDERS = 4;

export function sanitizePostLoginPath(next: string | null | undefined): string {
  if (!next || !next.startsWith('/') || next.startsWith('//')) {
    return MY_INSURANCE_PATH;
  }
  if (next.startsWith('/auth/')) return MY_INSURANCE_PATH;
  if (
    next === '/my-move' ||
    next.startsWith('/my-move/') ||
    next === '/portal' ||
    next.startsWith('/portal/')
  ) {
    return MY_INSURANCE_PATH;
  }
  try {
    const base = HUB_CANONICAL_ORIGIN;
    const parsed = new URL(next, base);
    if (parsed.origin !== new URL(base).origin) {
      return MY_INSURANCE_PATH;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || MY_INSURANCE_PATH;
  } catch {
    return MY_INSURANCE_PATH;
  }
}
