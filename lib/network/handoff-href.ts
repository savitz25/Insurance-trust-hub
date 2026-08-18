/**
 * Client-safe helpers for network bar / inter-hub links.
 * Cross-hub always uses same-origin /start (guest-safe plain 307 without code).
 */

export type HubLinkId =
  | 'move'
  | 'insurance'
  | 'lender'
  | 'contractor'
  | 'senior'
  | 'investor';

export const SSO_HANDOFF_HUBS = new Set<HubLinkId>([
  'move',
  'insurance',
  'lender',
  'contractor',
]);

const HUB_URL: Record<HubLinkId, string> = {
  move: 'https://www.movetrusthub.com',
  insurance: 'https://www.insurancetrusthub.com',
  lender: 'https://www.lendertrusthub.com',
  contractor: 'https://www.contractortrusthub.com',
  senior: 'https://www.seniortrusthub.com',
  investor: 'https://www.investortrusthub.com',
};

const HUB_HOME: Record<HubLinkId, string> = {
  move: '/my-move',
  insurance: '/my-insurance',
  lender: '/my-lending',
  contractor: '/',
  senior: '/',
  investor: '/',
};

const HOST_TO_HUB: Array<{ fragment: string; id: HubLinkId }> = [
  { fragment: 'movetrusthub.com', id: 'move' },
  { fragment: 'insurancetrusthub.com', id: 'insurance' },
  { fragment: 'lendertrusthub.com', id: 'lender' },
  { fragment: 'contractortrusthub.com', id: 'contractor' },
  { fragment: 'seniortrusthub.com', id: 'senior' },
  { fragment: 'investortrusthub.com', id: 'investor' },
];

export function networkHandoffStartHref(to: HubLinkId, next?: string): string {
  const path = next?.startsWith('/') ? next : HUB_HOME[to];
  return `/api/auth/network-handoff/start?to=${encodeURIComponent(to)}&next=${encodeURIComponent(path)}`;
}

export function networkHubPublicUrl(to: HubLinkId): string {
  return HUB_URL[to];
}

/** Always handoff start — /start is guest-safe. */
export function networkHubHref(to: HubLinkId, _signedIn?: boolean, next?: string): string {
  if (!SSO_HANDOFF_HUBS.has(to)) return HUB_URL[to];
  return networkHandoffStartHref(to, next);
}

/** Rewrite absolute specialist-hub URLs through handoff start (always). */
export function rewriteCrossHubHref(
  href: string,
  _signedIn: boolean,
  currentHub: HubLinkId
): string {
  if (!href) return href;
  try {
    const base =
      typeof window !== 'undefined' ? window.location.origin : HUB_URL[currentHub];
    const u = new URL(href, base);
    const host = u.hostname.toLowerCase();
    for (const { fragment, id } of HOST_TO_HUB) {
      if (host.includes(fragment)) {
        if (id === currentHub) {
          return `${u.pathname}${u.search}${u.hash}` || '/';
        }
        if (!SSO_HANDOFF_HUBS.has(id)) return href;
        const next = `${u.pathname}${u.search}` || HUB_HOME[id];
        return networkHandoffStartHref(id, next);
      }
    }
    return href;
  } catch {
    return href;
  }
}
