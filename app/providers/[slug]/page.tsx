import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { format } from 'date-fns';
import {
  ExternalLink,
  MapPin,
  Phone,
  Mail,
  Globe,
  Users,
} from 'lucide-react';
import { getProviderBySlug } from '@/lib/providers/queries';
import { getReviewsForProvider, getRatingBreakdown } from '@/lib/providers/reviews';
import { getProviderLicenseUrl } from '@/lib/providers/license';
import { buildMetadata } from '@/lib/seo/metadata';
import { shareRouteOgImage } from '@/lib/seo/share-hub';
import { JsonLd } from '@/lib/seo/json-ld';
import { buildInsuranceAgencySchema } from '@/lib/seo/schemas';
import nextDynamic from 'next/dynamic';
import { INSURANCE_TYPES, US_STATES } from '@/lib/constants';
import { StarRating } from '@/components/star-rating';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { TrustMark } from '@/components/network/trust-mark';
import { BeforeYouReachOut } from '@/components/research/before-you-reach-out';
import { SaveProviderButton } from '@/components/my-insurance/save-provider-button';
import { CompareProviderButton } from '@/components/my-insurance/compare-provider-button';
import { GovernmentVerificationPanel } from '@/components/insurance/cms/government-verification-panel';
import {
  governmentVerificationApplicable,
  resolveGovernmentVerification,
} from '@/lib/insurance/cms/resolve-government-verification';
import {
  allowContactForm,
  toPublicProviderView,
} from '@/lib/provenance/public-listing';
import {
  canShowAsVerified,
  resolveProviderTrustState,
} from '@/lib/insurance/trust/provider-trust-state';
import { toPublicSecondarySignals } from '@/lib/enrichment/public-secondary';
import { InsuranceVerificationBadge } from '@/components/verification-badge';
import { ProviderSecondarySignals } from '@/components/provider-secondary-signals';
import { ProviderAppointmentSnapshotSection } from '@/components/provider-appointment-snapshot';
import { AgencyTrustReportSection } from '@/components/agency-trust-report';
import { loadAgencyTrustReportForProvider } from '@/lib/national/load-agency-trust-report';
import { classifyFloridaProfileModules } from '@/lib/national/fl-profile-modules';
import { FloridaProfileModulesSection } from '@/components/florida/florida-profile-modules';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ContextNav } from '@/components/context-nav';
import type { Provider } from '@/types/provider';
import { loaSpecialtyTags } from '@/lib/dfs/loa';
import {
  allowsRegulatorLeadForm,
  getLoaSourcePhrase,
  getMedicareNonClaim,
  getRegulatorProfile,
  getRegulatorShortLabel,
  getVerificationExplanation,
} from '@/lib/regulators/labels';
import {
  extractDbaFromName,
  loaPlainLanguageForTags,
  agencyCapabilitySummary,
} from '@/lib/dfs/agency-display';
import { resolveLicenseFreshness } from '@/lib/providers/license-freshness';
import { continueClusterForProvider } from '@/lib/providers/continue-cluster';
import { ContinueClusterResearch } from '@/components/profile/continue-cluster-research';
import { SaveResearchSessionButton } from '@/components/my-insurance/save-research-session-button';
import { localHubPathForProvider } from '@/lib/dfs/agency-display';
import { displayEmail, displayPhone } from '@/lib/insurance-ask/agency-card-projection';

function firstPublicReportContact(
  report: { contacts: Array<{ kind: string; value: string; publicEligible: boolean }> } | null,
  kind: 'phone' | 'email',
): string | null {
  if (!report) return null;
  const values = report.contacts
    .filter((contact) => contact.publicEligible === true && contact.kind === kind)
    .map((contact) => contact.value.trim())
    .filter(Boolean)
    .sort();
  return values[0] ?? null;
}

const LeadForm = nextDynamic(() =>
  import('@/components/lead-form').then((m) => m.LeadForm)
);
const WriteReviewForm = nextDynamic(() =>
  import('@/components/my-insurance/write-review-form').then((m) => m.WriteReviewForm)
);

function extractNpnFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const m = notes.match(/\bNPN\s+([0-9A-Za-z-]+)\b/i);
  if (!m?.[1] || /^n\/?a$/i.test(m[1])) return null;
  return m[1];
}

interface ProviderPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ from?: string }>;
}

export const dynamic = 'force-dynamic';
export const dynamicParams = true;

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: ProviderPageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const provider = await getProviderBySlug(slug);
    if (!provider) {
      return { title: 'Provider Not Found', robots: { index: false, follow: true } };
    }
    const trust = resolveProviderTrustState(provider);
    const verified = canShowAsVerified(trust);
    const og = verified
      ? shareRouteOgImage(
          `/providers/${slug}`,
          `${provider.name} — insurance research on InsuranceTrustHub`,
        )
      : null;
    return buildMetadata({
      title: `${provider.name} — ${provider.city}, ${provider.state} Insurance Research`,
      description:
        provider.short_description ??
        `Research ${provider.name} in ${provider.city}, ${provider.state}. Re-check licenses on official state tools.`,
      path: `/providers/${slug}`,
      noIndex: !verified,
      imageUrl: og?.url,
      imageAlt: og?.alt,
    });
  } catch {
    return { title: 'Provider Not Found', robots: { index: false, follow: true } };
  }
}

/**
 * Phase 1 fail-closed loader: never throw 500 to consumers.
 * Only verified TrustState profiles render; all else → notFound().
 */
async function loadVerifiedProvider(slug: string): Promise<Provider | null> {
  try {
    const provider = await getProviderBySlug(slug);
    if (!provider) return null;
    if (!canShowAsVerified(resolveProviderTrustState(provider))) return null;
    return provider;
  } catch {
    return null;
  }
}

export default async function ProviderPage({ params, searchParams }: ProviderPageProps) {
  const { slug } = await params;
  const sp = searchParams ? await searchParams : {};
  const provider = await loadVerifiedProvider(slug);
  if (!provider) notFound();

  const publicView = toPublicProviderView(provider);
  // Belt-and-suspenders: never render non-verified profiles
  if (!canShowAsVerified(resolveProviderTrustState(provider))) notFound();
  const specialties = Array.isArray(provider.specialties) ? provider.specialties : [];
  const loaTags = loaSpecialtyTags(specialties);
  const loaBlurbs = loaPlainLanguageForTags(loaTags);
  const { legalName, dba } = extractDbaFromName(provider.name);
  const insuranceTypes = Array.isArray(provider.insurance_types)
    ? provider.insurance_types
    : [];
  const locationParts = [
    provider.city,
    provider.county ? `${provider.county} County` : null,
    provider.state,
    provider.zip,
  ].filter(Boolean);
  const hasHighConfidenceWebsite = Boolean(
    provider.website?.trim() &&
      provider.enrichment?.google?.matchConfidence === 'high'
  );
  const licenseJurisdiction = (
    provider.license_state ||
    provider.state ||
    ''
  ).toUpperCase();
  const licenseStateOnFile = (provider.license_state || '').trim().toUpperCase();
  const licenseStateName =
    US_STATES.find((item) => item.code === licenseStateOnFile)?.name ??
    US_STATES.find((item) => item.name.toUpperCase() === licenseStateOnFile)?.name ??
    null;
  const licenseOnFileLabel = licenseStateName
    ? `${licenseStateName}${provider.residency === 'non_resident' ? ' non-resident' : ''} license on file`
    : null;
  const regulator = getRegulatorProfile(licenseJurisdiction);
  const regulatorName =
    regulator?.label ||
    publicView.verification.sourceLabel ||
    'State insurance department';
  const regulatorShort = getRegulatorShortLabel(licenseJurisdiction);
  const npn = extractNpnFromNotes(provider.license_notes);
  const freshness = resolveLicenseFreshness(provider.license_checked_at);
  const continueCluster = continueClusterForProvider(provider);
  const localHub = localHubPathForProvider(provider);

  let secondarySignals = null;
  try {
    secondarySignals = toPublicSecondarySignals(provider);
  } catch {
    secondarySignals = null;
  }

  const showContact =
    allowContactForm(publicView.listingClass) &&
    allowsRegulatorLeadForm(licenseJurisdiction);

  let reviews: Awaited<ReturnType<typeof getReviewsForProvider>> = [];
  try {
    reviews = await getReviewsForProvider(slug);
  } catch {
    reviews = [];
  }
  const breakdown = getRatingBreakdown(reviews);
  const totalBreakdown = Object.values(breakdown).reduce((a, b) => a + b, 0) || 1;
  const licenseUrl = getProviderLicenseUrl(provider);

  let governmentVerification;
  try {
    governmentVerification = resolveGovernmentVerification(provider);
  } catch {
    governmentVerification = {
      title: 'Government Verification',
      cmsParticipation: 'pending' as const,
      cmsParticipationLabel: 'Pending verification',
      npi: null,
      medicareNotes: 'Verification data temporarily unavailable.',
      lastCmsUpdate: new Date().toISOString(),
      dataSourceLabel: 'State DOI',
      licenseVerified: false,
      licenseNumber: provider.license_number,
      licenseState: provider.license_state || provider.state,
    };
  }

  let agencyTrustReport = null;
  try {
    agencyTrustReport = await loadAgencyTrustReportForProvider(provider.id);
  } catch {
    agencyTrustReport = null;
  }

  // Only render CMS/Medicare/NPI evidence when a structured, source-backed
  // signal (Medicare specialty tag, medicare insurance type, or an NPI on
  // file) makes it relevant — never inferred from free-text description
  // matches, and never on a plain agency profile with no such relationship.
  const showGovernmentVerification = governmentVerificationApplicable(provider);

  const businessType = specialties.some((item) => /independent agency/i.test(item))
    ? 'Independent insurance agency'
    : 'Insurance agency';
  const glanceLines = loaTags.length
    ? loaTags.slice(0, 4)
    : insuranceTypes
        .map((type) => INSURANCE_TYPES.find((item) => item.value === type)?.label ?? String(type))
        .slice(0, 4);
  const shownPhone =
    publicView.phone ?? displayPhone(firstPublicReportContact(agencyTrustReport, 'phone'));
  const shownEmail = displayEmail(firstPublicReportContact(agencyTrustReport, 'email'));
  let websiteHost: string | null = null;
  if (provider.website?.trim()) {
    try {
      websiteHost = new URL(provider.website).host.replace(/^www\./, '');
    } catch {
      websiteHost = null;
    }
  }

  const suitsRelocating =
    specialties.includes('Relocation Experienced') ||
    specialties.includes('Medicare Specialists') ||
    specialties.includes('Bilingual Services') ||
    (publicView.yearsInBusiness != null && publicView.yearsInBusiness >= 10);

  return (
    <>
      <JsonLd data={buildInsuranceAgencySchema(provider)} />

      <div className="border-b bg-muted/20">
        <div className="container mx-auto px-4 py-8 md:py-10">
          <ContextNav
            pathname={`/providers/${slug}`}
            from={sp.from}
            currentLabel={provider.name}
            className="mb-5"
          />
          <p className="text-sm font-medium text-[#0284C7]">{businessType}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-[#0A2540] md:text-4xl">
            {dba ? legalName : provider.name}
          </h1>
          {dba ? (
            <p className="mt-2 text-base text-muted-foreground">
              Doing business as{' '}
              <span className="font-semibold text-foreground">{dba}</span>
            </p>
          ) : null}
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-base text-[#1E293B]">
            <MapPin className="h-4 w-4 shrink-0 text-[#0284C7]" aria-hidden />
            <span>Recorded office: {locationParts.join(' · ')}</span>
          </p>
          {licenseOnFileLabel ? (
            <p className="mt-1 text-base font-medium text-[#0A2540]">{licenseOnFileLabel}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <InsuranceVerificationBadge verification={publicView.verification} />
            {freshness.badge ? (
              <Badge variant={freshness.kind === 'stale' ? 'outline' : 'secondary'}>
                {freshness.badge}
              </Badge>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <SaveProviderButton
              providerSlug={provider.slug}
              providerName={provider.name}
              providerId={provider.id}
              city={provider.city}
              state={provider.state}
              licenseSummary={
                publicView.verification.licenseNumber
                  ? `License ${publicView.verification.licenseNumber}`
                  : undefined
              }
              lines={insuranceTypes.map(String)}
              defaultStatus="shortlisted"
            />
            <CompareProviderButton
              providerSlug={provider.slug}
              providerName={provider.name}
            />
            {shownPhone && (
              <Button asChild variant="outline" className="gap-2">
                <a href={`tel:${shownPhone.replace(/\D/g, '')}`}>
                  <Phone className="h-4 w-4" /> {shownPhone}
                </a>
              </Button>
            )}
            {provider.website && (
              <Button asChild className="gap-2" variant={hasHighConfidenceWebsite ? 'default' : 'outline'}>
                <a href={provider.website} target="_blank" rel="noopener noreferrer">
                  <Globe className="h-4 w-4" /> Visit website
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            )}
          </div>

          <section className="mt-6" aria-label="At a glance">
            <h2 className="text-sm font-semibold uppercase tracking-[0.12em] text-[#1E293B]">
              At a glance
            </h2>
            <dl className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <div className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-3">
                <dt className="text-xs uppercase text-[#1E293B]">Business</dt>
                <dd className="mt-1 text-sm font-semibold text-[#0A2540]">{businessType}</dd>
              </div>
              {publicView.verification.licenseNumber ? (
                <div className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-3">
                  <dt className="text-xs uppercase text-[#1E293B]">
                    {licenseOnFileLabel ?? 'State license on file'}
                  </dt>
                  <dd className="mt-1 text-sm font-semibold tabular-nums text-[#0A2540]">
                    {licenseOnFileLabel
                      ? publicView.verification.licenseNumber
                      : `${licenseJurisdiction} ${publicView.verification.licenseNumber}`}
                  </dd>
                </div>
              ) : null}
              {npn ? (
                <div className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-3">
                  <dt className="text-xs uppercase text-[#1E293B]">NPN</dt>
                  <dd className="mt-1 text-sm font-semibold tabular-nums text-[#0A2540]">{npn}</dd>
                </div>
              ) : null}
              <div className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-3">
                <dt className="text-xs uppercase text-[#1E293B]">Credential status</dt>
                <dd className="mt-1 text-sm font-semibold text-[#0A2540]">
                  {publicView.verification.badgeLabel}
                </dd>
              </div>
              {glanceLines.length ? (
                <div className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-3 col-span-2">
                  <dt className="text-xs uppercase text-[#1E293B]">Profile categories</dt>
                  <dd className="mt-1 text-sm font-semibold text-[#0A2540]">{glanceLines.join(' · ')}</dd>
                </div>
              ) : null}
              {publicView.yearsInBusiness ? (
                <div className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-3">
                  <dt className="text-xs uppercase text-[#1E293B]">Years in business</dt>
                  <dd className="mt-1 text-sm font-semibold text-[#0A2540]">
                    {publicView.yearsInBusiness}
                  </dd>
                </div>
              ) : null}
              {shownPhone ? (
                <div className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-3">
                  <dt className="text-xs uppercase text-[#1E293B]">Phone</dt>
                  <dd className="mt-1 text-sm font-semibold text-[#0A2540]">
                    <a href={`tel:${shownPhone.replace(/\D/g, '')}`} className="hover:underline">
                      {shownPhone}
                    </a>
                  </dd>
                </div>
              ) : null}
              {shownEmail ? (
                <div className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-3">
                  <dt className="text-xs uppercase text-[#1E293B]">Email</dt>
                  <dd className="mt-1 text-sm font-semibold text-[#0A2540]">
                    <a href={`mailto:${encodeURIComponent(shownEmail)}`} className="hover:underline break-all">
                      {shownEmail}
                    </a>
                  </dd>
                </div>
              ) : null}
              {provider.website ? (
                <div className="rounded-xl border border-[#E2E8F0] bg-white px-3 py-3">
                  <dt className="text-xs uppercase text-[#1E293B]">Website</dt>
                  <dd className="mt-1 text-sm font-semibold text-[#0A2540]">
                    <a href={provider.website} target="_blank" rel="noopener noreferrer" className="hover:underline">
                      {websiteHost ?? 'Public website'}
                    </a>
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 md:py-14">
        <div className={showContact ? 'grid gap-10 lg:grid-cols-[1fr_360px]' : 'grid gap-10'}>
          <div className="space-y-10">
            <section>
              <h2 className="text-xl font-semibold mb-3">Contact information</h2>
              <Card>
                <CardContent className="pt-6 space-y-2">
                  <p className="text-sm flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" aria-hidden />
                    <span>{locationParts.join(', ')}</span>
                  </p>
                  <p className="text-sm text-muted-foreground">
                    This is the recorded office on file. It is not a service area.
                  </p>
                  {shownPhone ? (
                    <p className="text-sm flex items-center gap-2">
                      <Phone className="h-4 w-4 text-primary shrink-0" aria-hidden />
                      <a
                        href={`tel:${shownPhone.replace(/\D/g, '')}`}
                        className="text-primary hover:underline"
                      >
                        {shownPhone}
                      </a>
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No public phone is on file.</p>
                  )}
                  {shownEmail ? (
                    <p className="text-sm flex items-center gap-2">
                      <Mail className="h-4 w-4 text-primary shrink-0" aria-hidden />
                      <a
                        href={`mailto:${encodeURIComponent(shownEmail)}`}
                        className="text-primary hover:underline break-all"
                      >
                        {shownEmail}
                      </a>
                    </p>
                  ) : null}
                  {provider.website ? (
                    <p className="text-sm flex items-center gap-2">
                      <Globe className="h-4 w-4 text-primary shrink-0" aria-hidden />
                      <a
                        href={provider.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {websiteHost ?? 'Public website'}
                      </a>
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground">No public website is on file.</p>
                  )}
                  <Link
                    href={`/directory?state=${licenseJurisdiction}&verified=true`}
                    className="inline-block text-sm text-primary hover:underline pt-1"
                  >
                    More verified agencies in {provider.city} →
                  </Link>
                </CardContent>
              </Card>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">License &amp; credentials</h2>
              <Card>
                <CardContent className="pt-6 space-y-3 text-sm">
                  <p>
                    <span className="font-medium">Status:</span>{' '}
                    {publicView.verification.badgeLabel}
                  </p>
                  {publicView.verification.licenseNumber ? (
                    <p>
                      <span className="font-medium">License number:</span>{' '}
                      <span className="tabular-nums">{publicView.verification.licenseNumber}</span>
                      {licenseJurisdiction ? ` · ${licenseJurisdiction}` : ''}
                    </p>
                  ) : null}
                  {npn ? (
                    <p>
                      <span className="font-medium">NPN:</span>{' '}
                      <span className="tabular-nums">{npn}</span>
                    </p>
                  ) : null}
                  {freshness.badge ? (
                    <p>
                      <span className="font-medium">Record checked:</span> {freshness.badge}
                    </p>
                  ) : null}
                  <Button asChild variant="outline" size="sm" className="gap-2">
                    <a href={licenseUrl} target="_blank" rel="noopener noreferrer">
                      Check this license with {regulatorShort}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">What they&apos;re licensed for</h2>
              <Card>
                <CardContent className="pt-6 space-y-4">
                  {loaTags.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {loaTags.map((tag) => (
                        <Badge key={tag} variant="secondary">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {insuranceTypes.map((t) => (
                        <Badge key={t} variant="secondary">
                          {INSURANCE_TYPES.find((it) => it.value === t)?.label ?? t}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {loaBlurbs.length > 0 ? (
                    <ul className="space-y-2 text-sm text-muted-foreground leading-relaxed">
                      {loaBlurbs.map(({ tag, blurb, mapped }) => (
                        <li key={tag}>
                          <span className="font-medium text-foreground">{tag}</span>
                          {!mapped ? (
                            <span className="text-xs uppercase tracking-wide"> · regulator tag</span>
                          ) : null}
                          : {blurb}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Capability tags come from {getLoaSourcePhrase(licenseJurisdiction)} on the public
                      license record when available.
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground leading-relaxed border-t pt-4">
                    We never invent Medicare-certified status from {regulatorShort} alone, never
                    invent websites, and never treat carrier appointments as quality rankings.
                  </p>
                  {provider.description ? (
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line border-t pt-4">
                      {provider.description}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">About this agency</h2>
              <Card>
                <CardContent className="pt-6 space-y-3 text-sm">
                  {provider.short_description ? (
                    <p className="leading-relaxed text-[#1E293B]">{provider.short_description}</p>
                  ) : null}
                  <p>
                    <span className="font-medium">Legal / listed name:</span>{' '}
                    {dba ? legalName : provider.name}
                  </p>
                  {dba ? (
                    <p>
                      <span className="font-medium">DBA:</span> {dba}
                    </p>
                  ) : null}
                  <p className="text-muted-foreground leading-relaxed">
                    {agencyCapabilitySummary(provider)}
                  </p>
                </CardContent>
              </Card>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">How verified</h2>
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <p className="text-sm">
                    <span className="font-medium">Regulator:</span> {regulatorName}
                  </p>
                  {publicView.verification.sourceLabel ? (
                    <p className="text-sm">
                      <span className="font-medium">Source:</span>{' '}
                      {publicView.verification.sourceLabel}
                    </p>
                  ) : null}
                  {publicView.verification.lastCheckedLabel ? (
                    <p className="text-sm">
                      <span className="font-medium">As of / last checked:</span>{' '}
                      {publicView.verification.lastCheckedLabel}
                    </p>
                  ) : null}
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {freshness.note} {publicView.verification.summary} Research dossier — not an
                    endorsement or ranking.{' '}
                    {getVerificationExplanation(licenseJurisdiction, regulatorName)} This listing is
                    research context — not a recommendation or ranking. Public listings require a
                    re-checkable license number, {regulatorName} as regulator, and Phase 1 verified
                    trust gates. {getMedicareNonClaim(licenseJurisdiction)}
                  </p>
                  {provider.residency === 'non_resident' ? (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {licenseJurisdiction || 'State'}-licensed (non-resident).
                      {provider.home_address_state
                        ? ` Home office state on file: ${provider.home_address_state} (address metadata only — not a verified ${provider.home_address_state} license).`
                        : ' Home office is outside the license state. That address is metadata only, not a second verified license.'}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm" className="gap-2">
                      <a href={licenseUrl} target="_blank" rel="noopener noreferrer">
                        Verify license in {licenseJurisdiction}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                    {regulator ? (
                      <Button asChild variant="ghost" size="sm" className="gap-2">
                        <a href={regulator.lookupUrl} target="_blank" rel="noopener noreferrer">
                          {regulator.lookupLinkLabel}
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    ) : null}
                    <SaveResearchSessionButton
                      session={{
                        title: `${provider.name} research session`,
                        source: 'profile',
                        providerSlug: provider.slug,
                        providerName: provider.name,
                        hubPath: localHub?.href ?? null,
                        directoryHref: `/directory?state=${licenseJurisdiction}&verified=true`,
                        resumeHref: `/providers/${provider.slug}`,
                        plannerHref: '/calculators/aca-subsidy',
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed pt-2 border-t border-border/60">
                    Research listing only — not an endorsement, rating, or appointment guarantee.
                  </p>
                  <TrustMark />
                </CardContent>
              </Card>
            </section>

            {agencyTrustReport ? (
              <AgencyTrustReportSection report={agencyTrustReport} />
            ) : null}

            <FloridaProfileModulesSection
              modules={classifyFloridaProfileModules(agencyTrustReport)}
            />

            {provider.appointment_snapshot &&
            provider.appointment_snapshot.totalCount > 0 ? (
              <ProviderAppointmentSnapshotSection
                snapshot={provider.appointment_snapshot}
              />
            ) : null}

            {secondarySignals ? (
              <ProviderSecondarySignals signals={secondarySignals} />
            ) : null}

            <ContinueClusterResearch cluster={continueCluster} />

            {showGovernmentVerification ? (
              <GovernmentVerificationPanel data={governmentVerification} />
            ) : null}

            {publicView.showCarriers && publicView.carriers.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold mb-2">Carrier notes</h2>
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Listed when sourced:</span>{' '}
                  {publicView.carriers.join(', ')}. Appointments (when shown later) are regulatory
                  snapshots, not endorsements.
                </p>
              </section>
            )}

            {suitsRelocating && (
              <section className="rounded-xl border border-trust/30 bg-trust/5 p-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5 text-trust" />
                  Why this provider may suit relocating families
                </h2>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground leading-relaxed list-disc pl-5">
                  {specialties.includes('Independent Agency') && (
                    <li>
                      Independent agency model — can shop multiple carriers when you move to a new
                      state.
                    </li>
                  )}
                  {specialties.includes('Bilingual Services') && (
                    <li>
                      Bilingual services available for families navigating coverage in a new area.
                    </li>
                  )}
                  {provider.years_in_business != null && provider.years_in_business >= 10 && (
                    <li>
                      {provider.years_in_business}+ years serving local communities — experienced
                      with regional coverage requirements.
                    </li>
                  )}
                  <li>
                    Licensed in {licenseJurisdiction} — confirm reciprocity and new-policy timelines
                    before your move date.
                  </li>
                </ul>
              </section>
            )}

            {reviews.length > 0 ? (
            <>
            <section>
              <h2 className="text-xl font-semibold mb-4">Rating breakdown</h2>
              <Card>
                <CardContent className="pt-6 space-y-2">
                  {[5, 4, 3, 2, 1].map((star) => {
                    const count = breakdown[star] ?? 0;
                    const pct = Math.round((count / totalBreakdown) * 100);
                    return (
                      <div key={star} className="flex items-center gap-3 text-sm">
                        <span className="w-8 tabular-nums">{star}★</span>
                        <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="w-8 text-right text-muted-foreground tabular-nums">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">Customer reviews</h2>
              {reviews.length === 0 ? (
                <p className="text-muted-foreground text-sm">No published reviews yet.</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => {
                    const created = review.createdAt ? new Date(review.createdAt) : null;
                    const dateLabel =
                      created && !Number.isNaN(created.getTime())
                        ? format(created, 'MMM d, yyyy')
                        : null;
                    return (
                      <Card key={review.id}>
                        <CardContent className="pt-6">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <StarRating rating={review.rating} size="sm" showNumber={false} />
                            {dateLabel ? (
                              <span className="text-xs text-muted-foreground">{dateLabel}</span>
                            ) : null}
                          </div>
                          <h3 className="mt-2 font-medium">{review.title}</h3>
                          <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                            {review.content}
                          </p>
                          <p className="mt-3 text-xs text-muted-foreground">
                            — {review.author}
                            {review.authorLocation ? ` · ${review.authorLocation}` : ''}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </section>
            </>
            ) : null}

            <section>
              <h2 className="text-xl font-semibold mb-4">Write a review</h2>
              <WriteReviewForm providerSlug={provider.slug} providerName={provider.name} />
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Public evidence</h2>
              <Card>
                <CardContent className="pt-6 text-sm space-y-3">
                  <p>
                    <span className="font-medium">License verification:</span>{' '}
                    {publicView.verification.showLicenseVerifiedBadge
                      ? 'Re-checkable license number on file'
                      : 'License number on file — confirm status on official lookup'}
                  </p>
                  {publicView.showReviews && publicView.rating != null && publicView.reviewCount ? (
                    <p>
                      <span className="font-medium">Consumer reviews:</span>{' '}
                      {publicView.rating.toFixed(1)} · {publicView.reviewCount} reviews (attributed
                      snapshot, not a TrustHub rating)
                    </p>
                  ) : null}
                  {secondarySignals?.bbb?.rating ? (
                    <p>
                      <span className="font-medium">BBB snapshot:</span>{' '}
                      {secondarySignals.bbb.rating}
                      {secondarySignals.bbb.checkedAtLabel
                        ? ` · as of ${secondarySignals.bbb.checkedAtLabel}`
                        : ''}
                    </p>
                  ) : null}
                  {publicView.yearsInBusiness ? (
                    <p>
                      <span className="font-medium">Tenure:</span> {publicView.yearsInBusiness} years
                      in business
                    </p>
                  ) : null}
                  <p className="text-muted-foreground">
                    No TrustHub score, grade, or ranking is calculated from this evidence. See{' '}
                    <Link href="/methodology" className="text-primary underline">
                      methodology
                    </Link>
                    .
                  </p>
                </CardContent>
              </Card>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">Official sources</h2>
              <Card>
                <CardContent className="pt-6 space-y-3 text-sm text-muted-foreground">
                  <p>
                    Re-check the license on the official state tool before you share personal
                    information or buy a policy. This page is not an endorsement.
                  </p>
                  {!showContact ? (
                    <p>
                      Contact forms are available only on independently verified research listings.
                      Use official state tools to re-check licenses before sharing personal data.
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link href="/tools/license-verification">Verify a license</Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link href="/methodology">Research methodology</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </section>
          </div>

          {showContact ? (
            <aside className="lg:sticky lg:top-24 lg:self-start space-y-6">
              <Card className="shadow-trust-lg">
                <CardHeader>
                  <CardTitle className="text-lg">Contact this agency</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="mb-4 text-xs text-muted-foreground leading-relaxed">
                    Direct options first: call the listed number or visit the agency website. The
                    form below only relays a message to this agency — it is not a quote funnel and
                    does not affect rankings.
                  </p>
                  <LeadForm
                    providerSlug={provider.slug}
                    providerName={provider.name}
                    defaultState={provider.state}
                    defaultInsuranceType={insuranceTypes[0]}
                  />
                </CardContent>
              </Card>
            </aside>
          ) : null}
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 pb-12">
        <BeforeYouReachOut
          summaryLines={[
            provider.name,
            provider.license_number ? `License: ${provider.license_number}` : undefined,
            `${provider.city}, ${provider.state}`,
            `Profile: https://www.insurancetrusthub.com/providers/${provider.slug}`,
            'Verify Active status on state DOI / NAIC before enrolling',
          ].filter(Boolean) as string[]}
          mailtoSubject={`${provider.name} — Insurance Trust Hub research notes`}
        />
      </div>

      <DisclaimerBanner />
    </>
  );
}
