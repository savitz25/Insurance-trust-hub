import React from 'react';
import { JsonLd } from '@/lib/seo/json-ld';
import { DISCLAIMER } from '@/lib/constants';
import {
  BusinessSuppliedCard,
  ProviderLicenseCredentialBadges,
} from '@/components/providers/provider-license-profile';
import { resolveProviderStateView } from '@/lib/providers/state-view';
import type { Provider } from '@/types/provider';

/**
 * One state's license on the existing provider. Canonical is set by the route
 * metadata to the parent profile. This component does not create a provider.
 */
export function ProviderStateView({
  provider,
  stateCode,
  now,
}: {
  provider: Provider;
  stateCode: string;
  now?: Date;
}) {
  const view = resolveProviderStateView(provider, stateCode, now);
  if (!view) return null;

  return (
    <>
      <JsonLd data={view.jsonLd as Record<string, unknown>} />
      <article
        data-state-view={view.stateCode}
        data-provider-id={view.providerId}
        className="container mx-auto max-w-3xl px-4 py-8 md:py-10"
      >
        <p className="text-sm">
          <a href={view.parentPath} data-parent-profile="true" className="text-primary hover:underline">
            Parent profile
          </a>
        </p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[#0A2540]">{provider.name}</h1>
        <p className="mt-2 text-base text-[#1E293B]">
          {view.stateName} license. Same provider as the parent profile. This page lists only the{' '}
          {view.stateCode} license.
        </p>
        <div className="mt-6">
          <ProviderLicenseCredentialBadges licenses={view.licenses} now={now} force />
        </div>
        {view.officeCard ? (
          <div className="mt-6">
            <BusinessSuppliedCard supplied={view.officeCard} />
          </div>
        ) : null}
        <p className="mt-8 text-xs leading-relaxed text-muted-foreground">{DISCLAIMER}</p>
      </article>
    </>
  );
}
