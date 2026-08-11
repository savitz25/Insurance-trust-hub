'use client';

import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import {
  rewriteCrossHubHref,
  type HubLinkId,
} from '@/lib/network/handoff-href';

type CrossHubLinkProps = Omit<ComponentPropsWithoutRef<'a'>, 'href'> & {
  href: string;
  children: ReactNode;
  currentHub?: HubLinkId;
};

/**
 * Anchor that rewrites specialist-hub URLs through SSO handoff start.
 * Always rewrites (guest-safe) — does not depend on client session timing.
 */
export function CrossHubLink({
  href,
  children,
  currentHub = 'insurance',
  mode = 'public',
  rel,
  ...rest
}: CrossHubLinkProps & { mode?: 'public' | 'auth' }) {
  // Stage A′: public research handoffs stay crawlable absolute URLs
  const resolved =
    mode === 'auth' ? rewriteCrossHubHref(href, true, currentHub) : href;
  const isHandoff = resolved.startsWith('/api/auth/network-handoff/');

  return (
    <a
      href={resolved}
      rel={isHandoff ? undefined : rel ?? 'noopener noreferrer'}
      data-network-handoff={isHandoff ? 'start' : 'public'}
      data-journey-link={mode === 'public' ? 'crawlable' : undefined}
      {...rest}
    >
      {children}
    </a>
  );
}
