import { SITE_URL } from '@/lib/constants';

export const MY_INSURANCE_PATH = '/my-insurance';
export const AUTH_CALLBACK_PATH = '/auth/callback';
export const AUTH_CONFIRM_PATH = '/auth/confirm';

/** Canonical production origin for this hub — never movetrusthub.com */
export const HUB_CANONICAL_ORIGIN = 'https://www.insurancetrusthub.com';
const HUB_HOST_FRAGMENT = 'insurancetrusthub.com';

/**
 * Resolve this hub’s public origin for Auth redirects.
 * Priority: request Host (this hub / localhost) → env if Insurance → canonical.
 * Wrong env (e.g. Move URL) is ignored so magic links never land on Move.
 */
export function resolveSiteOrigin(request?: Request | null): string {
  if (request) {
    const hostRaw = (
      request.headers.get('x-forwarded-host') ||
      request.headers.get('host') ||
      ''
    )
      .split(',')[0]
      .trim()
      .toLowerCase();

    if (hostRaw.includes(HUB_HOST_FRAGMENT)) {
      const proto = (
        request.headers.get('x-forwarded-proto') ||
        'https'
      )
        .split(',')[0]
        .trim();
      return `${proto}://${hostRaw}`.replace(/\/$/, '');
    }

    if (
      hostRaw.startsWith('localhost') ||
      hostRaw.startsWith('127.0.0.1')
    ) {
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
        return env;
      }
      console.warn(
        '[auth] NEXT_PUBLIC_SITE_URL is not an Insurance host; ignoring for redirects:',
        env
      );
    } catch {
      /* ignore */
    }
  }

  return HUB_CANONICAL_ORIGIN;
}

/**
 * Static site origin for emails / SEO — Insurance only (never trust a Move env).
 */
export const PRODUCTION_SITE_ORIGIN = (() => {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, '');
  if (env) {
    try {
      if (new URL(env).hostname.toLowerCase().includes(HUB_HOST_FRAGMENT)) {
        return env;
      }
    } catch {
      /* ignore */
    }
  }
  return SITE_URL.replace(/\/$/, '') || HUB_CANONICAL_ORIGIN;
})();

export function authCallbackUrl(nextPath: string, origin?: string): string {
  const base = (origin || resolveSiteOrigin()).replace(/\/$/, '');
  return `${base}${AUTH_CALLBACK_PATH}?next=${encodeURIComponent(nextPath)}`;
}

/** Prefer authCallbackUrl(next, resolveSiteOrigin(request)). Canonical fallback. */
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
