import 'server-only';

import {
  AUTH_CALLBACK_URL,
  PRODUCTION_SITE_ORIGIN,
  sanitizePostLoginPath,
} from '@/lib/my-insurance/constants';

/**
 * Force Supabase authorize `redirect_to` onto InsuranceTrustHub auth callback.
 */
export function ensureInsuranceOAuthUrl(
  oauthUrl: string,
  nextPath?: string | null
): string {
  try {
    const parsed = new URL(oauthUrl);
    const next = sanitizePostLoginPath(nextPath);
    const desired = `${AUTH_CALLBACK_URL}?next=${encodeURIComponent(next)}`;
    parsed.searchParams.set('redirect_to', desired);
    return parsed.toString();
  } catch {
    return oauthUrl;
  }
}

export function insuranceAuthSuccessUrl(nextPath?: string | null): string {
  const next = sanitizePostLoginPath(nextPath);
  return new URL(next, PRODUCTION_SITE_ORIGIN).toString();
}

export function insuranceAuthErrorUrl(nextPath?: string | null): string {
  const next = sanitizePostLoginPath(nextPath);
  return new URL(
    `/my-insurance?auth=error&next=${encodeURIComponent(next)}`,
    PRODUCTION_SITE_ORIGIN
  ).toString();
}
