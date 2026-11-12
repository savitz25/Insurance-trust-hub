import type { Provider } from '@/types/provider';
import type { LicenseEntry } from '@/types/supabase';
import type { BusinessSuppliedOfficeView, BusinessSuppliedView } from '@/lib/providers/business-supplied';
import { badgeEligibleLicenses } from '@/lib/providers/license-entries';
import { buildInsuranceAgencySchema } from '@/lib/seo/schemas';
import { normalizeStateCode, stateNameForCode } from '@/lib/providers/state-code';

export interface ProviderStateListingLink {
  code: string;
  href: string;
}

export interface ProviderStateViewModel {
  /** Same providers.id. A state view never allocates another row. */
  providerId: string;
  slug: string;
  stateCode: string;
  stateName: string;
  /** Founder decision 2026-11-12: canonical is the parent profile. */
  parentPath: string;
  licenses: LicenseEntry[];
  offices: BusinessSuppliedOfficeView[];
  officeCard: BusinessSuppliedView | null;
  jsonLd: ReturnType<typeof buildInsuranceAgencySchema>;
}

/**
 * Links for badge-eligible states other than the primary (licenses[0]) state.
 * Hidden unless the provider is licensed in two or more states, so a
 * single-license profile renders nothing new.
 */
export function stateListingLinks(
  provider: Provider,
  now: Date = new Date()
): ProviderStateListingLink[] {
  const seen: string[] = [];
  for (const entry of badgeEligibleLicenses({ licenses: provider.licenses ?? [] }, now)) {
    const code = normalizeStateCode(entry.state);
    if (code && !seen.includes(code)) seen.push(code);
  }
  if (seen.length < 2) return [];
  const primary = normalizeStateCode(provider.license_state);
  const codes = primary ? seen.filter((code) => code !== primary) : seen;
  if (codes.length === 0) return [];
  return codes.map((code) => ({
    code,
    href: `/providers/${provider.slug}/${code.toLowerCase()}`,
  }));
}

function officesForState(
  supplied: BusinessSuppliedView | null | undefined,
  stateCode: string
): BusinessSuppliedView | null {
  if (!supplied) return null;
  const offices = supplied.offices.filter((office) => office.jurisdiction === stateCode);
  if (offices.length === 0) return null;
  return {
    title: supplied.title,
    fieldLabel: supplied.fieldLabel,
    source: supplied.source,
    suppliedAt: null,
    suppliedVia: null,
    lines: [],
    hours: [],
    phone: null,
    email: null,
    emailHref: null,
    offices,
  };
}

/**
 * Same providers row, one badge-eligible state. Null means the route 404s.
 * Informational licenses are not eligible. contact.address is not read or written.
 */
export function resolveProviderStateView(
  provider: Provider,
  stateParam: string,
  now: Date = new Date()
): ProviderStateViewModel | null {
  const stateCode = normalizeStateCode(stateParam);
  if (!stateCode) return null;
  const licenses = badgeEligibleLicenses({ licenses: provider.licenses ?? [] }, now).filter(
    (entry) => normalizeStateCode(entry.state) === stateCode
  );
  if (licenses.length === 0) return null;
  const officeCard = officesForState(provider.business_supplied, stateCode);
  const parentPath = `/providers/${provider.slug}`;
  return {
    providerId: provider.id,
    slug: provider.slug,
    stateCode,
    stateName: stateNameForCode(stateCode),
    parentPath,
    licenses,
    offices: officeCard?.offices ?? [],
    officeCard,
    jsonLd: buildInsuranceAgencySchema(
      {
        ...provider,
        licenses,
        informational_licenses: [],
      },
      { now, forceCredentials: true }
    ),
  };
}

/** Metadata path is the parent profile, never `/providers/{slug}/{state}`. */
export function stateViewMetadataOptions(
  provider: Provider,
  stateParam: string,
  now: Date = new Date()
): { title: string; description: string; path: string } | null {
  const view = resolveProviderStateView(provider, stateParam, now);
  if (!view) return null;
  return {
    title: `${provider.name} — ${view.stateName} license`,
    description: `${provider.name} ${view.stateCode} license. Same provider as ${view.parentPath}. Re-check the license with the state regulator.`,
    path: view.parentPath,
  };
}
