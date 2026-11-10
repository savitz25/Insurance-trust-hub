import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  BUSINESS_SUPPLIED_FIELD_LABEL,
  type BusinessSuppliedView,
} from '@/lib/providers/business-supplied';
import {
  badgeEligibleLicenses,
  informationalLicenseSentence,
  licenseClassLabel,
  licenseExpirationLabel,
  licenseRecheckLabel,
  licenseRecheckUrl,
  licenseResidencyLabel,
  shouldRenderLicenseCredentialBadges,
} from '@/lib/providers/license-entries';
import type { InformationalLicense, LicenseEntry } from '@/types/supabase';
import type { Provider } from '@/types/provider';

export function ProviderLicenseCredentialBadges({
  licenses,
  now,
}: {
  licenses?: LicenseEntry[] | null;
  now?: Date;
}) {
  const licenseInfo = { licenses: licenses ?? [] };
  if (!shouldRenderLicenseCredentialBadges(licenseInfo, now)) return null;
  const eligible = badgeEligibleLicenses(licenseInfo, now);

  return (
    <ul className="space-y-3 pt-2" aria-label="State license badges">
      {eligible.map((entry) => {
        const residency = licenseResidencyLabel(entry.residency);
        const href = licenseRecheckUrl(entry);
        return (
          <li
            key={`${entry.state}-${entry.license_number}`}
            data-license-badge="true"
            data-license-state={entry.state}
            data-license-number={entry.license_number}
            className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-3"
          >
            <Badge variant="success" className="gap-1">
              {entry.state} {entry.license_number}
            </Badge>
            <p className="mt-2 text-sm">
              <span className="font-medium">Class:</span> {licenseClassLabel(entry)}
            </p>
            <p className="text-sm">
              <span className="font-medium">Expiration:</span>{' '}
              {licenseExpirationLabel(entry.expires_at)}
            </p>
            {residency ? (
              <p className="text-sm">
                <span className="font-medium">Residency:</span> {residency}
              </p>
            ) : null}
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              {licenseRecheckLabel(entry)}
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export function ProviderInformationalLicenses({
  entries,
}: {
  entries?: InformationalLicense[] | null;
}) {
  if (!entries?.length) return null;
  return (
    <div data-informational-licenses="true" className="space-y-2 border-t pt-3">
      {entries.map((entry) => (
        <p
          key={`${entry.state}-${entry.license_number}`}
          data-informational-license={entry.license_number}
          className="text-sm text-muted-foreground"
        >
          {informationalLicenseSentence(entry)}
        </p>
      ))}
    </div>
  );
}

function BusinessField({
  name,
  children,
}: {
  name: string;
  children: React.ReactNode;
}) {
  return (
    <div data-business-field={name}>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">
        {name} <span className="font-semibold">{BUSINESS_SUPPLIED_FIELD_LABEL}</span>
      </dt>
      <dd className="mt-1 text-sm text-foreground">{children}</dd>
    </div>
  );
}

export function BusinessSuppliedCard({ supplied }: { supplied?: BusinessSuppliedView | null }) {
  if (!supplied) return null;
  return (
    <section aria-label={supplied.title}>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{supplied.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-3">
            {supplied.suppliedAt ? (
              <BusinessField name="Supplied at">{supplied.suppliedAt}</BusinessField>
            ) : null}
            {supplied.suppliedVia ? (
              <BusinessField name="Supplied via">{supplied.suppliedVia}</BusinessField>
            ) : null}
            {supplied.lines.length ? (
              <BusinessField name="Lines">{supplied.lines.join(', ')}</BusinessField>
            ) : null}
            {supplied.hours.length ? (
              <BusinessField name="Hours">{supplied.hours.join('; ')}</BusinessField>
            ) : null}
            {supplied.offices.map((office) => (
              <div key={`${office.label}-${office.address}`} data-office={office.label}>
                <BusinessField name={office.label}>
                  {office.address}
                  {office.verified ? null : <span> unverified</span>}
                </BusinessField>
              </div>
            ))}
            {supplied.phone ? <BusinessField name="Phone">{supplied.phone}</BusinessField> : null}
            {supplied.email ? (
              <BusinessField name="Email">
                {supplied.emailHref ? (
                  <a href={supplied.emailHref} className="text-primary hover:underline break-all">
                    {supplied.email} (business-supplied)
                  </a>
                ) : (
                  <span>
                    {supplied.email} (business-supplied)
                  </span>
                )}
              </BusinessField>
            ) : null}
          </dl>
        </CardContent>
      </Card>
    </section>
  );
}

/** Profile extras covered by the fixture page test. Null pieces render nothing. */
export function ProviderLicenseProfileExtras({
  provider,
  now,
}: {
  provider: Provider;
  now?: Date;
}) {
  return (
    <>
      <ProviderLicenseCredentialBadges licenses={provider.licenses} now={now} />
      <ProviderInformationalLicenses entries={provider.informational_licenses} />
      <BusinessSuppliedCard supplied={provider.business_supplied} />
    </>
  );
}
