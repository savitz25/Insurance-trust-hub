'use client';

import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import {
  rewriteCrossHubHref,
  type HubLinkId,
} from '@/lib/network/handoff-href';
import { useMyInsuranceOptional } from '@/components/my-insurance/my-insurance-provider';

type CrossHubLinkProps = Omit<ComponentPropsWithoutRef<'a'>, 'href'> & {
  href: string;
  children: ReactNode;
  currentHub?: HubLinkId;
};

/**
 * Anchor that rewrites specialist-hub URLs through SSO handoff when signed in.
 */
export function CrossHubLink({
  href,
  children,
  currentHub = 'insurance',
  rel,
  ...rest
}: CrossHubLinkProps) {
  const mi = useMyInsuranceOptional();
  const signedIn = Boolean(mi?.user) && !mi?.loading;
  const resolved = rewriteCrossHubHref(href, signedIn, currentHub);
  const isHandoff = resolved.startsWith('/api/auth/network-handoff/');

  return (
    <a
      href={resolved}
      rel={isHandoff ? undefined : rel ?? 'noopener noreferrer'}
      {...rest}
    >
      {children}
    </a>
  );
}
