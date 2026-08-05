import {
  authCallbackUrl,
  resolveSiteOrigin,
  sanitizePostLoginPath,
} from '@/lib/my-insurance/constants';

/**
 * Force Supabase authorize `redirect_to` onto InsuranceTrustHub auth callback.
 */
export function ensureInsuranceOAuthUrl(
  oauthUrl: string,
  nextPath?: string | null,
  origin?: string
): string {
  try {
    const parsed = new URL(oauthUrl);
    const next = sanitizePostLoginPath(nextPath);
    const desired = authCallbackUrl(next, origin);
    parsed.searchParams.set('redirect_to', desired);
    return parsed.toString();
  } catch {
    return oauthUrl;
  }
}

export function insuranceAuthSuccessUrl(
  nextPath?: string | null,
  origin?: string
): string {
  const next = sanitizePostLoginPath(nextPath);
  return new URL(next, origin || resolveSiteOrigin()).toString();
}

export function insuranceAuthErrorUrl(
  nextPath?: string | null,
  origin?: string
): string {
  const next = sanitizePostLoginPath(nextPath);
  return new URL(
    `/my-insurance?auth=error&next=${encodeURIComponent(next)}`,
    origin || resolveSiteOrigin()
  ).toString();
}
