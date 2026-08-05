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
