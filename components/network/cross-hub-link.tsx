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
  rel,
  ...rest
}: CrossHubLinkProps) {
  const resolved = rewriteCrossHubHref(href, true, currentHub);
  const isHandoff = resolved.startsWith('/api/auth/network-handoff/');

  return (
    <a
      href={resolved}
      rel={isHandoff ? undefined : rel ?? 'noopener noreferrer'}
      data-network-handoff={isHandoff ? 'start' : undefined}
      {...rest}
    >
      {children}
    </a>
  );
}
