/** Cache-bust query for brand assets — bump when logo files change. */
export const BRAND_ASSET_VERSION = '20260727';

export function brandAsset(path: string): string {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${clean}?v=${BRAND_ASSET_VERSION}`;
}

/** Primary horizontal lockup (wordmark + mark). */
export const BRAND_LOGO = {
  header: '/brand/insurance-trust-hub-logo-header.png',
  header2x: '/brand/insurance-trust-hub-logo-header@2x.png',
  full: '/brand/insurance-trust-hub-logo-stacked.png',
  fullSm: '/brand/insurance-trust-hub-logo-stacked-sm.png',
  full2x: '/brand/insurance-trust-hub-logo-stacked@2x.png',
  og: '/brand/insurance-trust-hub-og.png',
  icon192: '/brand/insurance-trust-hub-icon-192.png',
  icon512: '/brand/insurance-trust-hub-icon.png',
  favicon32: '/brand/insurance-trust-hub-favicon-32.png',
  favicon16: '/brand/insurance-trust-hub-favicon-16.png',
} as const;
