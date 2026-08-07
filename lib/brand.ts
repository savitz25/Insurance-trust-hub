/** Insurance Trust Hub brand paths — keep cache version in sync with logo assets. */

import { INSURANCE_BRAND, INSURANCE_TAGLINE } from '@/lib/design/insurance-design-system';

/** Bump when logo / favicon assets change (cache bust). */
export const BRAND_ASSET_VERSION = '20260807ith-p1';
export const INSURANCE_LOGO_VERSION = BRAND_ASSET_VERSION;

export function brandAsset(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${clean}?v=${BRAND_ASSET_VERSION}`;
}

export const BRAND = {
  name: 'Insurance Trust Hub',
  shortName: 'ITH',
  domain: 'insurancetrusthub.com',
  url: 'https://www.insurancetrusthub.com',
  email: 'hello@insurancetrusthub.com',
  tagline: INSURANCE_TAGLINE,
  colors: INSURANCE_BRAND,
} as const;

/** Primary horizontal lockup (wordmark + mark) — transparent PNG. */
export const BRAND_LOGO = {
  header: '/brand/insurance-trust-hub-logo-header.png',
  header2x: '/brand/insurance-trust-hub-logo-header@2x.png',
  full: '/brand/insurance-trust-hub-logo-stacked.png',
  fullSm: '/brand/insurance-trust-hub-logo-stacked-sm.png',
  full2x: '/brand/insurance-trust-hub-logo-stacked@2x.png',
  footer: '/brand/insurance-trust-hub-logo-footer.png',
  transparent: '/brand/InsuranceTrustHub-logo-transparent.png',
  og: '/brand/insurance-trust-hub-og.png',
  icon192: '/brand/insurance-trust-hub-icon-192.png',
  icon512: '/brand/insurance-trust-hub-icon.png',
  favicon32: '/brand/insurance-trust-hub-favicon-32.png',
  favicon16: '/brand/insurance-trust-hub-favicon-16.png',
} as const;
