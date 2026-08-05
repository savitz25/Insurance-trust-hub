import {
  authExternalRedirectUrl,
  HUB_CANONICAL_ORIGIN,
  sanitizePostLoginPath,
} from '@/lib/my-insurance/constants';

/**
 * Force Supabase authorize redirect_to onto Move bridge or direct ITH callback.
 */
export function ensureInsuranceOAuthUrl(
  oauthUrl: string,
  nextPath?: string | null
): string {
  try {
    const parsed = new URL(oauthUrl);
    parsed.searchParams.set(
      'redirect_to',
      authExternalRedirectUrl(sanitizePostLoginPath(nextPath))
    );
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
  return new URL(next, origin || HUB_CANONICAL_ORIGIN).toString();
}

export function insuranceAuthErrorUrl(
  nextPath?: string | null,
  origin?: string
): string {
  const next = sanitizePostLoginPath(nextPath);
  return new URL(
    `/my-insurance?auth=error&next=${encodeURIComponent(next)}`,
    origin || HUB_CANONICAL_ORIGIN
  ).toString();
}
