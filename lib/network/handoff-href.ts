/**
 * Client-safe helpers for network bar / inter-hub links.
 * When signed in, route through same-origin handoff start; else plain hub URL.
 */

export type HubLinkId = 'move' | 'insurance' | 'lender';

const HUB_URL: Record<HubLinkId, string> = {
  move: 'https://www.movetrusthub.com',
  insurance: 'https://www.insurancetrusthub.com',
  lender: 'https://www.lendertrusthub.com',
};

const HUB_HOME: Record<HubLinkId, string> = {
  move: '/my-move',
  insurance: '/my-insurance',
  lender: '/my-lending',
};

const HOST_TO_HUB: Array<{ fragment: string; id: HubLinkId }> = [
  { fragment: 'movetrusthub.com', id: 'move' },
  { fragment: 'insurancetrusthub.com', id: 'insurance' },
  { fragment: 'lendertrusthub.com', id: 'lender' },
];

/** Path used by network bar when signed in (silent SSO). */
export function networkHandoffStartHref(to: HubLinkId, next?: string): string {
  const path = next?.startsWith('/') ? next : HUB_HOME[to];
  return `/api/auth/network-handoff/start?to=${encodeURIComponent(to)}&next=${encodeURIComponent(path)}`;
}

export function networkHubPublicUrl(to: HubLinkId): string {
  return HUB_URL[to];
}

/** Pick handoff vs public URL based on session. */
export function networkHubHref(to: HubLinkId, signedIn: boolean, next?: string): string {
  if (!signedIn) return networkHubPublicUrl(to);
  return networkHandoffStartHref(to, next);
}

/**
 * Rewrite absolute specialist-hub URLs through handoff when signed in.
 * Leaves same-site, Ask parent, and non-hub URLs unchanged.
 */
export function rewriteCrossHubHref(
  href: string,
  signedIn: boolean,
  currentHub: HubLinkId
): string {
  if (!signedIn || !href) return href;
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
        const next = `${u.pathname}${u.search}` || HUB_HOME[id];
        return networkHandoffStartHref(id, next);
      }
    }
    return href;
  } catch {
    return href;
  }
}
