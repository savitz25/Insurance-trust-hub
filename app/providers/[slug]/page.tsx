import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { format } from 'date-fns';
import {
  BadgeCheck,
  ExternalLink,
  MapPin,
  Phone,
  Globe,
  Shield,
  Users,
} from 'lucide-react';
import { getProviderBySlug } from '@/lib/providers/queries';
import { getReviewsForProvider, getRatingBreakdown } from '@/lib/providers/reviews';
import { getProviderLicenseUrl } from '@/lib/providers/license';
import { FALLBACK_PROVIDERS } from '@/lib/providers/fallback-data';
import { INSURANCE_HUBS } from '@/lib/hubs/registry';
import { getAgentsForHub } from '@/lib/hubs/agents';
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
import { toPublicSecondarySignals } from '@/lib/enrichment/pipeline';
import { InsuranceVerificationBadge } from '@/components/verification-badge';
import { ProviderSecondarySignals } from '@/components/provider-secondary-signals';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ContextNav } from '@/components/context-nav';
import { cn } from '@/lib/utils';

interface ProviderPageProps {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ from?: string }>;
}

export async function generateStaticParams() {
  const hubSlugs = INSURANCE_HUBS.flatMap((hub) =>
    getAgentsForHub(hub).map((a) => ({ slug: a.slug }))
  );
  const fallback = FALLBACK_PROVIDERS.map((p) => ({ slug: p.slug }));
  const seen = new Set<string>();
  return [...fallback, ...hubSlugs].filter((p) => {
    if (seen.has(p.slug)) return false;
    seen.add(p.slug);
    return true;
  });
}

export async function generateMetadata({ params }: ProviderPageProps): Promise<Metadata> {
  const { slug } = await params;
  const provider = await getProviderBySlug(slug);
  if (!provider) return { title: 'Provider Not Found' };

  const view = toPublicProviderView(provider);
  const seed = view.listingClass === 'seed';

  return buildMetadata({
    title: `${provider.name} — ${provider.city}, ${provider.state} Insurance Research`,
    description:
      provider.short_description ??
      `Research ${provider.name} in ${provider.city}, ${provider.state}. Re-check licenses on official state tools.`,
    path: `/providers/${slug}`,
    noIndex: seed,
  });
}

export default async function ProviderPage({ params, searchParams }: ProviderPageProps) {
  const { slug } = await params;
  const sp = searchParams ? await searchParams : {};
  const provider = await getProviderBySlug(slug);
  if (!provider) notFound();

  const publicView = toPublicProviderView(provider);
  const secondarySignals = toPublicSecondarySignals(provider);
  const showContact = allowContactForm(publicView.listingClass);
  const reviews = await getReviewsForProvider(slug);
  const breakdown = getRatingBreakdown(reviews);
  const totalBreakdown = Object.values(breakdown).reduce((a, b) => a + b, 0) || 1;
  const licenseUrl = getProviderLicenseUrl(provider);
  const governmentVerification = resolveGovernmentVerification(provider);
  const trustBreakdown = computeProviderTrustScoreBreakdown({
    bbbRating: publicView.listingClass === 'seed' ? null : provider.bbb_rating,
    isVerified: publicView.verification.showLicenseVerifiedBadge,
    yearsInBusiness: publicView.yearsInBusiness,
    cmsParticipation: governmentVerification.cmsParticipation,
    hasNpi: Boolean(governmentVerification.npi),
    isMedicareSpecialist: providerIsMedicareSpecialist(provider),
    licenseNumber: provider.license_number,
    isSeed: publicView.listingClass === 'seed',
    googleRating: publicView.showReviews ? publicView.rating : null,
    googleReviewCount: publicView.showReviews ? publicView.reviewCount : null,
  });

  const suitsRelocating =
    publicView.listingClass !== 'seed' &&
    (provider.specialties.includes('Relocation Experienced') ||
      provider.specialties.includes('Medicare Specialists') ||
      provider.specialties.includes('Bilingual Services') ||
      (publicView.yearsInBusiness != null && publicView.yearsInBusiness >= 10));

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
                {publicView.listingClass === 'seed' ? (
                  <Badge variant="outline">Seed listing — not verified research</Badge>
                ) : null}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{provider.name}</h1>
              {provider.short_description && (
                <p className="mt-3 text-lg text-muted-foreground leading-relaxed">
                  {provider.short_description}
                </p>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-4">
                {publicView.showReviews && publicView.rating != null ? (
                  <>
                    <StarRating rating={publicView.rating} size="lg" />
                    <span className="text-sm text-muted-foreground">
                      {publicView.reviewCount} review
                      {publicView.reviewCount !== 1 ? 's' : ''}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    No independently verified review summary available
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-muted-foreground max-w-xl">
                {publicView.verification.summary}
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
                lines={provider.insurance_types?.map(String)}
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
                <Button asChild className="gap-2">
                  <a href={provider.website} target="_blank" rel="noopener noreferrer">
                    <Globe className="h-4 w-4" /> Website
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
            {provider.description && (
              <section>
                <h2 className="text-xl font-semibold mb-3">About this agency</h2>
                <p className="text-muted-foreground leading-relaxed whitespace-pre-line">
                  {provider.description}
                </p>
              </section>
            )}

            <GovernmentVerificationPanel data={governmentVerification} />

            {secondarySignals ? (
              <ProviderSecondarySignals signals={secondarySignals} />
            ) : null}

            <section>
              <h2 className="text-xl font-semibold mb-4">License information</h2>
              <Card>
                <CardContent className="pt-6 space-y-3">
                  {provider.license_number && (
                    <p className="text-sm">
                      <span className="font-medium">License number:</span>{' '}
                      {provider.license_number}
                    </p>
                  )}
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Verify this agency&apos;s license status directly with the {provider.state}{' '}
                    insurance department before purchasing coverage.
                  </p>
                  <Button asChild variant="outline" size="sm" className="gap-2">
                    <a href={licenseUrl} target="_blank" rel="noopener noreferrer">
                      Verify license in {provider.state}
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </Button>
                  <p className="text-xs text-muted-foreground leading-relaxed pt-2 border-t border-border/60">
                    Research listing only — not an endorsement of this agency.
                  </p>
                  <TrustMark />
                </CardContent>
              </Card>
            </section>

            <section>
              <h2 className="text-xl font-semibold mb-4">Service areas & specialties</h2>
              <div className="grid sm:grid-cols-2 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-primary" /> Service area
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">
                      {provider.city}, {provider.state}
                      {provider.zip ? ` ${provider.zip}` : ''}
                    </p>
                    <Link
                      href={`/directory?state=${provider.state}&city=${encodeURIComponent(provider.city)}`}
                      className="mt-2 inline-block text-sm text-primary hover:underline"
                    >
                      More agencies in {provider.city} →
                    </Link>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Shield className="h-4 w-4 text-primary" /> Coverage types
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1.5">
                      {provider.insurance_types.map((t) => (
                        <Badge key={t} variant="secondary">
                          {INSURANCE_TYPES.find((it) => it.value === t)?.label ?? t}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
              {provider.specialties.length > 0 && (
                <p className="mt-4 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Specialties:</span>{' '}
                  {provider.specialties.join(' · ')}
                </p>
              )}
              {publicView.showCarriers && publicView.carriers.length > 0 && (
                <p className="mt-2 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Represented carriers:</span>{' '}
                  {publicView.carriers.join(', ')}
                </p>
              )}
            </section>

            {suitsRelocating && (
              <section className="rounded-xl border border-trust/30 bg-trust/5 p-6">
                <h2 className="text-xl font-semibold flex items-center gap-2">
                  <Users className="h-5 w-5 text-trust" />
                  Why this provider may suit relocating families
                </h2>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground leading-relaxed list-disc pl-5">
                  {provider.specialties.includes('Independent Agency') && (
                    <li>
                      Independent agency model — can shop multiple carriers when you move to a new
                      state.
                    </li>
                  )}
                  {provider.specialties.includes('Bilingual Services') && (
                    <li>Bilingual services available for families navigating coverage in a new area.</li>
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
                  {reviews.map((review) => (
                    <Card key={review.id}>
                      <CardContent className="pt-6">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <StarRating rating={review.rating} size="sm" showNumber={false} />
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(review.createdAt), 'MMM d, yyyy')}
                          </span>
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
                  ))}
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
                  <LeadForm
                    providerSlug={provider.slug}
                    providerName={provider.name}
                    defaultState={provider.state}
                    defaultInsuranceType={provider.insurance_types[0]}
                  />
                ) : (
                  <div className="space-y-3 text-sm text-muted-foreground">
                    <p>
                      Contact forms are disabled on seed or unverified listings (research-only
                      policy). Use official state tools to re-check licenses before sharing personal
                      data.
                    </p>
                    <Button asChild variant="trust" className="w-full">
                      <Link href="/tools/license-verification">Verify a license</Link>
                    </Button>
                    <Button asChild variant="outline" className="w-full">
                      <Link href="/methodology">How we score research</Link>
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