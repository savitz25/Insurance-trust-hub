/**
 * SHARE-002 — Insurance Trust Hub social-share identity (repo-local).
 * Production canonical + default card must never drift to localhost,
 * a Vercel preview host, or another TrustHub domain.
 */

export const SHARE_HUB = {
  id: 'insurance',
  brand: 'Insurance Trust Hub',
  host: 'www.insurancetrusthub.com',
  apexHost: 'insurancetrusthub.com',
  origin: 'https://www.insurancetrusthub.com',
  ogImagePath: '/brand/insurance-trust-hub-og.png',
  ogWidth: 1200,
  ogHeight: 630,
  ogAlt:
    'Insurance Trust Hub — independent insurance research from the Ask Trust Hub Network',
  twitterCard: 'summary_large_image',
  networkLabel: 'ASK TRUST HUB NETWORK',
} as const;

export const FOREIGN_TRUSTHUB_HOSTS = [
  'www.asktrusthub.com',
  'asktrusthub.com',
  'www.movetrusthub.com',
  'movetrusthub.com',
  'www.lendertrusthub.com',
  'lendertrusthub.com',
  'www.contractortrusthub.com',
  'contractortrusthub.com',
  'www.seniortrusthub.com',
  'seniortrusthub.com',
  'www.investortrusthub.com',
  'investortrusthub.com',
] as const;

export function isForbiddenShareHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1') return true;
  if (host.endsWith('.vercel.app')) return true;
  return (FOREIGN_TRUSTHUB_HOSTS as readonly string[]).includes(host);
}

export function resolveShareOrigin(): string {
  return SHARE_HUB.origin;
}

export function shareOgImageAbsoluteUrl(
  origin: string = SHARE_HUB.origin,
  cacheQuery: string,
): string {
  const base = origin.replace(/\/$/, '');
  const q = cacheQuery.startsWith('?') ? cacheQuery : `?${cacheQuery}`;
  return `${base}${SHARE_HUB.ogImagePath}${q}`;
}
