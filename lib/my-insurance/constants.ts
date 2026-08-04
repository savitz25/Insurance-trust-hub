import { SITE_URL } from '@/lib/constants';

export const MY_INSURANCE_PATH = '/my-insurance';
export const AUTH_CALLBACK_PATH = '/auth/callback';
export const AUTH_CONFIRM_PATH = '/auth/confirm';

export const PRODUCTION_SITE_ORIGIN =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || SITE_URL.replace(/\/$/, '');

export const AUTH_CALLBACK_URL = `${PRODUCTION_SITE_ORIGIN}${AUTH_CALLBACK_PATH}`;

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
    const base = PRODUCTION_SITE_ORIGIN.includes('insurancetrusthub.com')
      ? PRODUCTION_SITE_ORIGIN
      : 'https://www.insurancetrusthub.com';
    const parsed = new URL(next, base);
    if (parsed.origin !== new URL(base).origin) {
      return MY_INSURANCE_PATH;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}` || MY_INSURANCE_PATH;
  } catch {
    return MY_INSURANCE_PATH;
  }
}
