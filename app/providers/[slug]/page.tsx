import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { format } from 'date-fns';
import {
  ExternalLink,
  MapPin,
  Phone,
  Globe,
  Users,
} from 'lucide-react';
import { getProviderBySlug } from '@/lib/providers/queries';
import { getReviewsForProvider, getRatingBreakdown } from '@/lib/providers/reviews';
import { getProviderLicenseUrl } from '@/lib/providers/license';
import { buildMetadata } from '@/lib/seo/metadata';
import { JsonLd } from '@/lib/seo/json-ld';
import { buildInsuranceAgencySchema } from '@/lib/seo/schemas';
import { INSURANCE_TYPES } from '@/lib/constants';
import { LeadForm } from '@/components/lead-form';
import { StarRating } from '@/components/star-rating';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { TrustMark } from '@/components/network/trust-mark';
import { BeforeYouReachOut } from '@/components/research/before-you-reach-out';
import { SaveProviderButton } from '@/components/my-insurance/save-provider-button';
import { CompareProviderButton } from '@/components/my-insurance/compare-provider-button';
import { WriteReviewForm } from '@/components/my-insurance/write-review-form';
import { GovernmentVerificationPanel } from '@/components/insurance/cms/government-verification-panel';
import { TrustScoreBreakdownPanel } from '@/components/insurance/cms/trust-score-breakdown';
import {
  providerIsMedicareSpecialist,
  resolveGovernmentVerification,
} from '@/lib/insurance/cms/resolve-government-verification';
import { computeProviderTrustScoreBreakdown } from '@/lib/insurance/enrichment/trust-score';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ContextNav } from '@/components/context-nav';
import { cn } from '@/lib/utils';
import type { Provider } from '@/types/provider';
import { loaSpecialtyTags } from '@/lib/dfs/loa';
import { FL_DFS_LOOKUP_URL } from '@/lib/dfs/launch-counties';
import { TX_TDI_LOOKUP_URL, TX_TDI_REGULATOR } from '@/lib/tdi/launch-markets';
import {
  extractDbaFromName,
  loaPlainLanguageForTags,
  localHubPathForProvider,
  agencyCapabilitySummary,
} from '@/lib/dfs/agency-display';

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
    return buildMetadata({
      title: `${provider.name} — ${provider.city}, ${provider.state} Insurance Research`,
      description:
        provider.short_description ??
        `Research ${provider.name} in ${provider.city}, ${provider.state}. Re-check licenses on official state tools.`,
      path: `/providers/${slug}`,
      noIndex: !canShowAsVerified(trust),
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
  const localHub = localHubPathForProvider(provider);
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
  const isTexas = (provider.state || '').toUpperCase() === 'TX';
  const isFlorida = (provider.state || '').toUpperCase() === 'FL';
  const npn = extractNpnFromNotes(provider.license_notes);
  const regulatorName = isTexas
    ? TX_TDI_REGULATOR
    : isFlorida
      ? 'Florida DFS'
      : publicView.verification.sourceLabel || 'State insurance department';

  let secondarySignals = null;
  try {
    secondarySignals = toPublicSecondarySignals(provider);
  } catch {
    secondarySignals = null;
  }

  const showContact = allowContactForm(publicView.listingClass);

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
      licenseState: provider.state,
    };
  }

  const trustBreakdown = computeProviderTrustScoreBreakdown({
    bbbRating: provider.bbb_rating,
    isVerified: publicView.verification.showLicenseVerifiedBadge,
    yearsInBusiness: publicView.yearsInBusiness,
    cmsParticipation: governmentVerification.cmsParticipation,
    hasNpi: Boolean(governmentVerification.npi),
    isMedicareSpecialist: providerIsMedicareSpecialist(provider),
    licenseNumber: provider.license_number,
    isSeed: false,
    googleRating: publicView.showReviews ? publicView.rating : null,
    googleReviewCount: publicView.showReviews ? publicView.reviewCount : null,
  });

  const suitsRelocating =
    specialties.includes('Relocation Experienced') ||
    specialties.includes('Medicare Specialists') ||
    specialties.includes('Bilingual Services') ||
    (publicView.yearsInBusiness != null && publicView.yearsInBusiness >= 10);

  return (
    <>
      <JsonLd data={buildInsuranceAgencySchema(provider)} />

      <div className="border-b bg-muted/20">
        <div className="container mx-auto px-4 py-10 md:py-14">
          <ContextNav
            pathname={`/providers/${slug}`}
            from={sp.from}
            currentLabel={provider.name}
            className="mb-5"
          />
          <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
            <div className="max-w-3xl">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <InsuranceVerificationBadge verification={publicView.verification} />
                <Badge variant="secondary">
                  {provider.city}, {provider.state}
                </Badge>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
                {dba ? legalName : provider.name}
              </h1>
              {dba ? (
                <p className="mt-2 text-base text-muted-foreground">
                  Doing business as{' '}
                  <span className="font-semibold text-foreground">{dba}</span>
                </p>
              ) : null}
              <p className="mt-2 text-sm text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-1">
                <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {locationParts.join(' · ')}
                <span className="text-muted-foreground/80">· Florida agency research profile</span>
              </p>
              {loaTags.length > 0 ? (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {loaTags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="font-medium">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : null}
              {provider.short_description && (
                <p className="mt-3 text-base text-muted-foreground leading-relaxed">
                  {provider.short_description}
                </p>
              )}
              <p className="mt-2 text-xs text-muted-foreground max-w-xl">
                {publicView.verification.summary} Research dossier — not an endorsement or ranking.
              </p>
            </div>

            <div className="flex flex-wrap gap-2 shrink-0">
              <SaveProviderButton
                providerSlug={provider.slug}
                providerName={provider.name}
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
              {publicView.phone && (
                <Button asChild variant="outline" className="gap-2">
                  <a href={`tel:${publicView.phone!.replace(/\D/g, '')}`}>
                    <Phone className="h-4 w-4" /> {publicView.phone}
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
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 md:py-14">
        <div className="grid lg:grid-cols-[1fr_360px] gap-10">
          <div className="space-y-10">
            <section>
              <h2 className="text-xl font-semibold mb-3">Who they are</h2>
              <Card>
                <CardContent className="pt-6 space-y-3 text-sm">
                  <p>
                    <span className="font-medium">Legal / listed name:</span>{' '}
                    {dba ? legalName : provider.name}
                  </p>
                  {dba ? (
                    <p>
                      <span className="font-medium">DBA:</span> {dba}
                    </p>
                  ) : null}
                  <p>
                    <span className="font-medium">Location:</span> {locationParts.join(', ')}
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    {agencyCapabilitySummary(provider)}{' '}
                    {isTexas
                      ? 'Texas Department of Insurance (TDI) is the license source of truth for this research listing.'
                      : isFlorida
                        ? 'Florida DFS is the license source of truth for this research listing.'
                        : `${regulatorName} is the license source of truth for this research listing.`}
                  </p>
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
                      {loaBlurbs.map(({ tag, blurb }) => (
                        <li key={tag}>
                          <span className="font-medium text-foreground">{tag}:</span> {blurb}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Capability tags come from Florida DFS lines of authority on the public license
                      record when available.
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground leading-relaxed border-t pt-4">
                    We never invent Medicare-certified status from DFS alone, never invent websites,
                    and never treat carrier appointments as quality rankings.
                  </p>
                  {provider.description ? (
                    <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line border-t pt-4">
                      {provider.description}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            </section>

            {provider.appointment_snapshot &&
            provider.appointment_snapshot.totalCount > 0 ? (
              <ProviderAppointmentSnapshotSection
                snapshot={provider.appointment_snapshot}
              />
            ) : null}

            <section>
              <h2 className="text-xl font-semibold mb-3">Where they&apos;re located</h2>
              <Card>
                <CardContent className="pt-6 space-y-2">
                  <p className="text-sm flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" aria-hidden />
                    <span>{locationParts.join(', ')}</span>
                  </p>
                  {publicView.phone ? (
                    <p className="text-sm flex items-center gap-2">
                      <Phone className="h-4 w-4 text-primary shrink-0" aria-hidden />
                      <a
                        href={`tel:${publicView.phone.replace(/\D/g, '')}`}
                        className="text-primary hover:underline"
                      >
                        {publicView.phone}
                      </a>
                    </p>
                  ) : null}
                  <Link
                    href={`/directory?state=${provider.state}&city=${encodeURIComponent(provider.city)}`}
                    className="inline-block text-sm text-primary hover:underline pt-1"
                  >
                    More verified agencies in {provider.city} →
                  </Link>
                </CardContent>
              </Card>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">How verification was determined</h2>
              <Card>
                <CardContent className="pt-6 space-y-3">
                  <p className="text-sm">
                    <span className="font-medium">Regulator:</span> {regulatorName}
                    {isTexas ? ' (TDI)' : null}
                  </p>
                  {publicView.verification.licenseNumber && (
                    <p className="text-sm">
                      <span className="font-medium">License number:</span>{' '}
                      <span className="tabular-nums">
                        {publicView.verification.licenseNumber}
                      </span>
                    </p>
                  )}
                  {npn ? (
                    <p className="text-sm">
                      <span className="font-medium">NPN:</span>{' '}
                      <span className="tabular-nums">{npn}</span>
                    </p>
                  ) : null}
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
                    {publicView.verification.summary} Public listings require a re-checkable license
                    number, {regulatorName} as regulator, and Phase 1 verified trust gates. Status
                    can change — always re-check on official tools before you enroll.
                    {isTexas
                      ? ' Medicare-certified status is never inferred from TDI agency open data alone. Agency/business entities only in this inventory.'
                      : null}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild variant="outline" size="sm" className="gap-2">
                      <a href={licenseUrl} target="_blank" rel="noopener noreferrer">
                        Verify license in {provider.state}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    </Button>
                    {isFlorida ? (
                      <Button asChild variant="ghost" size="sm" className="gap-2">
                        <a href={FL_DFS_LOOKUP_URL} target="_blank" rel="noopener noreferrer">
                          Florida DFS licensee search
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    ) : null}
                    {isTexas ? (
                      <Button asChild variant="ghost" size="sm" className="gap-2">
                        <a href={TX_TDI_LOOKUP_URL} target="_blank" rel="noopener noreferrer">
                          Texas TDI agent lookup
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </Button>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed pt-2 border-t border-border/60">
                    Research listing only — not an endorsement, rating, or appointment guarantee.
                  </p>
                  <TrustMark />
                </CardContent>
              </Card>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-3">How to research further</h2>
              <Card>
                <CardContent className="pt-6">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {publicView.phone ? (
                      <li>
                        Call the listed phone number and re-confirm identity against the{' '}
                        {isTexas ? 'TDI' : isFlorida ? 'DFS' : 'state'} license number before sharing
                        personal data.
                      </li>
                    ) : null}
                    {provider.website ? (
                      <li>
                        Visit the website on file (secondary public signal — not part of DFS
                        verification).
                      </li>
                    ) : null}
                    {provider.appointment_snapshot?.totalCount ? (
                      <li>
                        Review the appointment regulatory snapshot above, then re-check carriers on
                        Florida DFS.
                      </li>
                    ) : null}
                    <li>
                      <Link href="/tools/license-verification" className="text-primary hover:underline">
                        License verification tool
                      </Link>{' '}
                      — re-check state DOI records
                    </li>
                    <li>
                      <Link href="/methodology" className="text-primary hover:underline">
                        Methodology
                      </Link>{' '}
                      — how Insurance Trust Hub verifies listings
                    </li>
                    {localHub ? (
                      <li>
                        <Link href={localHub.href} className="text-primary hover:underline">
                          {localHub.label}
                        </Link>{' '}
                        — more verified agencies in this market
                      </li>
                    ) : null}
                    <li>
                      <Link href="/tools" className="text-primary hover:underline">
                        Research tools
                      </Link>{' '}
                      — marketplace landscape, needs assessment, cost planners
                    </li>
                    <li>
                      <Link
                        href={`/directory?state=${provider.state}&verified=true`}
                        className="text-primary hover:underline"
                      >
                        Agency directory
                      </Link>{' '}
                      — filter by specialty / state
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </section>

            <GovernmentVerificationPanel data={governmentVerification} />

            {secondarySignals ? (
              <ProviderSecondarySignals signals={secondarySignals} />
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
                    Licensed in {provider.state} — confirm reciprocity and new-policy timelines
                    before your move date.
                  </li>
                </ul>
              </section>
            )}

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

            <section>
              <h2 className="text-xl font-semibold mb-4">Write a review</h2>
              <WriteReviewForm providerSlug={provider.slug} providerName={provider.name} />
            </section>
          </div>

          <aside className="lg:sticky lg:top-24 lg:self-start space-y-6">
            <Card className="shadow-trust-lg">
              <CardHeader>
                <CardTitle className="text-lg">
                  {showContact ? 'Contact this agency' : 'Research tools'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {showContact ? (
                  <>
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
                  </>
                ) : (
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <p>
                      Contact forms are available only on independently verified research listings.
                      Use official state tools to re-check licenses before sharing personal data.
                    </p>
                    <Button asChild variant="trust" className="w-full">
                      <Link href="/tools/license-verification">Verify a license</Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/methodology">Research methodology</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Research metrics</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-4">
                {trustBreakdown.published ? (
                  <TrustScoreBreakdownPanel breakdown={trustBreakdown} />
                ) : (
                  <p className="text-muted-foreground">
                    Research Score not published — insufficient verified inputs (re-checkable
                    license required). See{' '}
                    <Link href="/methodology" className="text-primary underline">
                      methodology
                    </Link>
                    .
                  </p>
                )}
                {secondarySignals?.bbb?.rating ? (
                  <p>
                    <span className="font-medium">BBB snapshot:</span>{' '}
                    {secondarySignals.bbb.rating}
                    {secondarySignals.bbb.checkedAtLabel
                      ? ` · as of ${secondarySignals.bbb.checkedAtLabel}`
                      : ''}
                  </p>
                ) : null}
                {trustBreakdown.published ? (
                  <p className="text-[11px] text-muted-foreground">
                    Government Standing sub-score: {trustBreakdown.governmentStanding}/100.{' '}
                    <Link href="/data/plan-complaint-index" className="text-primary hover:underline">
                      Plan Complaint Index
                    </Link>
                  </p>
                ) : null}
              </CardContent>
            </Card>

            {publicView.yearsInBusiness ? (
              <p className={cn('text-center text-sm text-muted-foreground')}>
                {publicView.yearsInBusiness} years in business
              </p>
            ) : null}
          </aside>
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
