import Link from 'next/link';
import { Shield, MapPin, Users, Star, BarChart3 } from 'lucide-react';
import type { InsuranceHub } from '@/types/agent';
import type { Provider } from '@/types/provider';
import { getHubStats } from '@/lib/hubs/agents';
import { getCuratedHubConfig } from '@/lib/hubs/data/curated-hubs';
import { getAllCountySummaries } from '@/lib/insurance/cms/county-summaries';
import { ProviderCard } from '@/components/provider-card';
import { ZipSearch } from '@/components/zip-search';
import { HubMatchForm } from '@/components/hub-match-form';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { HowItWorks } from '@/components/how-it-works';
import { JsonLd } from '@/lib/seo/json-ld';
import { SITE_URL } from '@/lib/constants';
import { ContextNav } from '@/components/context-nav';
import {
  EMPTY_MARKET_COPY,
  filterVerifiedProviders,
  verifiedCountWithHealth,
} from '@/lib/insurance/trust/provider-trust-state';
import { honestCuratedSummary, resolveHubPublicSeo } from '@/lib/hubs/hub-seo';
import { HubInventoryPagination } from '@/components/hub-inventory-pagination';
import {
  HubSpecialtyFilter,
  type HubLoaFilterId,
} from '@/components/hub-specialty-filter';
import { inventoryScopeNoteForHub } from '@/lib/dfs/launch-counties';

interface HubPageViewProps {
  hub: InsuranceHub;
  canonicalPath?: string;
  /** Phase 4 — DFS-promoted verified providers for this market (page of cards) */
  verifiedProviders?: Provider[];
  /**
   * True verified match total for the hub (may exceed rendered cards).
   * When omitted, falls back to verifiedProviders.length.
   */
  verifiedTotal?: number;
  /** Cards shown on this page */
  inventoryShowing?: number;
  /** Explicit page size cap */
  inventoryPageSize?: number;
  /** 1-based page index for hub inventory */
  inventoryPage?: number;
  inventoryTotalPages?: number;
  /** Phase 5 LOA specialty chip filter */
  loaFilter?: HubLoaFilterId;
}

const COUNTY_DASHBOARD_BY_HUB_SLUG: Record<string, string> = {
  'miami-dade': 'miami-dade-fl',
  'broward-county': 'broward-fl',
  'palm-beach-county': 'palm-beach-fl',
  'miami-fort-lauderdale': 'miami-dade-fl',
};

/** Reciprocal ACA Marketplace research guides (educational clusters → flagship tool) */
const ACA_GUIDE_LINKS_BY_HUB: Record<string, Array<{ href: string; label: string }>> = {
  houston: [
    { href: '/guides/houston-aca-marketplace', label: 'Houston ACA guide' },
    { href: '/guides/texas-aca-marketplace', label: 'Texas ACA guide' },
    { href: '/tools/marketplace-plan-research', label: 'Local plan landscape' },
  ],
  'dallas-fort-worth': [
    { href: '/guides/dallas-aca-marketplace', label: 'Dallas ACA guide' },
    { href: '/guides/texas-aca-marketplace', label: 'Texas ACA guide' },
    { href: '/tools/marketplace-plan-research', label: 'Local plan landscape' },
  ],
  'miami-dade': [
    { href: '/guides/miami-dade-aca-marketplace', label: 'Miami-Dade ACA guide' },
    { href: '/tools/marketplace-plan-research', label: 'Local plan landscape' },
  ],
  'broward-county': [
    { href: '/guides/broward-aca-marketplace', label: 'Broward ACA guide' },
    { href: '/tools/marketplace-plan-research', label: 'Local plan landscape' },
  ],
  'palm-beach-county': [
    { href: '/guides/palm-beach-aca-marketplace', label: 'Palm Beach ACA guide' },
    { href: '/tools/marketplace-plan-research', label: 'Local plan landscape' },
  ],
  atlanta: [
    { href: '/guides/atlanta-aca-marketplace', label: 'Atlanta ACA guide' },
    { href: '/guides/georgia-aca-marketplace', label: 'Georgia ACA guide' },
    { href: '/tools/marketplace-plan-research', label: 'Local plan landscape' },
  ],
  charlotte: [
    { href: '/guides/charlotte-aca-marketplace', label: 'Charlotte ACA guide' },
    { href: '/guides/north-carolina-aca-marketplace', label: 'North Carolina ACA guide' },
    { href: '/tools/marketplace-plan-research', label: 'Local plan landscape' },
  ],
  raleigh: [
    { href: '/guides/research-triangle-aca-marketplace', label: 'Research Triangle ACA guide' },
    { href: '/guides/north-carolina-aca-marketplace', label: 'North Carolina ACA guide' },
    { href: '/tools/marketplace-plan-research', label: 'Local plan landscape' },
  ],
  greensboro: [
    { href: '/guides/north-carolina-aca-marketplace', label: 'North Carolina ACA guide' },
    { href: '/tools/marketplace-plan-research', label: 'Local plan landscape' },
  ],
  wilmington: [
    { href: '/guides/north-carolina-aca-marketplace', label: 'North Carolina ACA guide' },
    { href: '/tools/marketplace-plan-research', label: 'Local plan landscape' },
  ],
  philadelphia: [
    { href: '/guides/philadelphia-aca-marketplace', label: 'Philadelphia ACA guide' },
    { href: '/guides/pennsylvania-aca-marketplace', label: 'Pennsylvania ACA guide' },
    { href: '/tools/marketplace-plan-research', label: 'Local plan landscape' },
  ],
  pittsburgh: [
    { href: '/guides/pittsburgh-aca-marketplace', label: 'Pittsburgh ACA guide' },
    { href: '/guides/pennsylvania-aca-marketplace', label: 'Pennsylvania ACA guide' },
    { href: '/tools/marketplace-plan-research', label: 'Local plan landscape' },
  ],
  'nyc-newark-jersey-city': [
    { href: '/guides/nyc-aca-marketplace', label: 'NYC ACA guide' },
    { href: '/guides/long-island-aca-marketplace', label: 'Long Island ACA guide' },
    { href: '/guides/westchester-aca-marketplace', label: 'Westchester ACA guide' },
    { href: '/guides/new-york-aca-marketplace', label: 'New York ACA guide' },
    { href: '/tools/marketplace-plan-research', label: 'Local plan landscape' },
  ],
  hartford: [
    { href: '/guides/hartford-aca-marketplace', label: 'Hartford ACA guide' },
    { href: '/guides/connecticut-aca-marketplace', label: 'Connecticut ACA guide' },
    { href: '/guides/fairfield-county-aca-marketplace', label: 'Fairfield County ACA guide' },
    { href: '/tools/marketplace-plan-research', label: 'Local plan landscape' },
  ],
};

export function HubPageView({
  hub,
  canonicalPath,
  verifiedProviders = [],
  verifiedTotal,
  inventoryShowing,
  inventoryPageSize,
  inventoryPage = 1,
  inventoryTotalPages = 1,
  loaFilter = 'all',
}: HubPageViewProps) {
  const { stateSlug: state, slug } = hub;
  const path = canonicalPath ?? `/hubs/${state}/${slug}`;
  const dbProviders = filterVerifiedProviders(verifiedProviders);
  const baseStats = getHubStats(hub);
  // Market total = exact matched inventory (not silent page-size cap)
  const verifiedCount =
    typeof verifiedTotal === 'number' && verifiedTotal >= 0
      ? verifiedTotal
      : dbProviders.length;
  const showingCount =
    typeof inventoryShowing === 'number' ? inventoryShowing : dbProviders.length;
  const pageSize =
    typeof inventoryPageSize === 'number' ? inventoryPageSize : dbProviders.length;
  const isCapped = verifiedCount > showingCount;
  const inventoryScope = inventoryScopeNoteForHub(hub.slug);
  const isTexasHub = hub.stateCode === 'TX' || hub.stateSlug === 'texas';
  const isNewJerseyHub = hub.stateCode === 'NJ' || hub.stateSlug === 'new-jersey';
  const isOhioHub = hub.stateCode === 'OH' || hub.stateSlug === 'ohio';
  const isNorthCarolinaHub = hub.stateCode === 'NC' || hub.stateSlug === 'north-carolina';
  const regulatorLabel = isTexasHub
    ? 'Texas Department of Insurance (TDI)'
    : isOhioHub
      ? 'Ohio Department of Insurance (ODI)'
      : isNewJerseyHub
        ? 'New Jersey DOBI'
        : isNorthCarolinaHub
          ? 'North Carolina Department of Insurance (NC DOI)'
          : hub.stateCode === 'FL'
            ? 'Florida DFS'
            : 'state insurance department';
  const healthFromDb = dbProviders.filter((p) =>
    p.insurance_types?.includes('health')
  ).length;
  const healthCount = healthFromDb;
  const stats = {
    ...baseStats,
    totalAgents: verifiedCount,
    healthSpecialists: healthCount,
    verified: verifiedCount,
    avgTrustScore: null as number | null,
  };
  const curatedConfig = getCuratedHubConfig(hub.slug);
  const countyDashboardSlug = COUNTY_DASHBOARD_BY_HUB_SLUG[slug];
  const countySummary = countyDashboardSlug
    ? getAllCountySummaries().find((c) => c.slug === countyDashboardSlug)
    : undefined;
  const acaGuideLinks = ACA_GUIDE_LINKS_BY_HUB[slug];
  const seo = resolveHubPublicSeo(hub, path, {
    total: verifiedCount,
    health: healthCount,
  });
  const curatedSummary = curatedConfig
    ? honestCuratedSummary(hub.shortName, stats.totalAgents, curatedConfig.summary)
    : null;
  const healthProviders = dbProviders.filter((p) => p.insurance_types?.includes('health'));
  const otherProviders = dbProviders.filter((p) => !p.insurance_types?.includes('health'));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: seo.title,
    description: seo.description,
    url: `${SITE_URL}${path}`,
    about: {
      '@type': 'Place',
      name: hub.msaName,
      address: { '@type': 'PostalAddress', addressRegion: hub.stateCode, addressCountry: 'US' },
    },
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      <div className="container mx-auto px-4 pt-6">
        <ContextNav
          pathname={path}
          currentLabel={hub.shortName}
          backOverride={{
            href: `/hubs/${state}`,
            label: `Back to ${hub.stateName}`,
            shortLabel: hub.stateCode,
          }}
        />
      </div>

      {acaGuideLinks && acaGuideLinks.length > 0 ? (
        <div className="border-b bg-[#E0F2FE]/80">
          <div className="container mx-auto flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
            <p className="font-medium text-[#0A2540]">
              Research ACA Marketplace plans near {hub.shortName}
            </p>
            <div className="flex flex-wrap gap-3 font-medium text-[#0284C7]">
              {acaGuideLinks.map((l) => (
                <Link key={l.href} href={l.href} className="hover:underline">
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      <section className="border-b bg-gradient-to-br from-primary to-primary/80 py-14 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm">
            <Shield className="h-4 w-4" />
            {isTexasHub
              ? 'Independent research · Re-check Texas TDI licenses'
              : isOhioHub
                ? 'Independent research · Re-check Ohio ODI licenses'
                : isNewJerseyHub
                  ? 'Independent research · Re-check New Jersey DOBI licenses'
                  : isNorthCarolinaHub
                    ? 'Independent research · Re-check North Carolina DOI licenses'
                    : 'Independent research · Re-check state licenses'}
          </p>
          <h1 className="text-3xl md:text-5xl font-bold max-w-4xl mx-auto">
            Research insurance agencies in {hub.shortName}
          </h1>
          <p className="mt-2 text-lg text-primary-foreground/80">
            {isTexasHub
              ? `Verified Texas TDI agency research listings for ${hub.localDescriptor}`
              : isOhioHub
                ? `Verified Ohio Department of Insurance (ODI) agency research listings for ${hub.localDescriptor}`
                : isNewJerseyHub
                  ? `Verified New Jersey DOBI agency research listings for ${hub.localDescriptor}`
                  : isNorthCarolinaHub
                    ? `Verified North Carolina Department of Insurance (NC DOI) agency research listings for ${hub.localDescriptor}`
                    : `Licensed agencies with re-checkable public records for ${hub.localDescriptor}`}
          </p>
          <p className="mt-4 text-sm text-primary-foreground/70 max-w-2xl mx-auto">
            {verifiedCountWithHealth(stats.totalAgents, stats.healthSpecialists)}
          </p>
          {verifiedCount > 0 ? (
            <p className="mt-2 text-xs text-primary-foreground/60 max-w-2xl mx-auto">
              {isCapped
                ? `Showing ${showingCount.toLocaleString()} of ${verifiedCount.toLocaleString()} verified research listings on this page (page ${inventoryPage}${
                    inventoryTotalPages > 1 ? ` of ${inventoryTotalPages}` : ''
                  }, ${pageSize} per page).`
                : `${verifiedCount.toLocaleString()} verified research listing${
                    verifiedCount === 1 ? '' : 's'
                  }.`}
            </p>
          ) : null}
          {inventoryScope ? (
            <p className="mt-2 text-xs text-primary-foreground/55 max-w-2xl mx-auto leading-relaxed">
              {inventoryScope}
            </p>
          ) : null}
          <div className="mt-6 flex justify-center">
            <ZipSearch defaultZip={hub.zipCodes[0]} className="[&_input]:bg-white [&_button]:bg-trust" />
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10">
        <div className="grid lg:grid-cols-[1fr_300px] gap-10">
          <div className="space-y-12 min-w-0">
            <section>
              <h2 className="text-2xl font-bold mb-4">Local Market Snapshot</h2>
              <p className="text-muted-foreground leading-relaxed">{hub.marketSnapshot}</p>
              <div className="mt-4 grid sm:grid-cols-3 gap-4">
                <div className="rounded-lg border p-4 text-center">
                  <Users className="h-5 w-5 mx-auto text-primary mb-1" />
                  <p className="text-lg font-bold">{(hub.population / 1_000_000).toFixed(1)}M</p>
                  <p className="text-xs text-muted-foreground">Metro population</p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <MapPin className="h-5 w-5 mx-auto text-trust mb-1" />
                  <p className="text-lg font-bold capitalize">{hub.healthInsuranceDensity.replace('-', ' ')}</p>
                  <p className="text-xs text-muted-foreground">Health insurance density</p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <Star className="h-5 w-5 mx-auto text-amber-500 mb-1" />
                  <p className="text-lg font-bold">
                    {stats.avgTrustScore != null ? `${stats.avgTrustScore}/100` : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {stats.avgTrustScore != null
                      ? 'Avg research score'
                      : EMPTY_MARKET_COPY.scoreUnavailable}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                <strong className="text-foreground">Enrollment highlight:</strong> {hub.enrollmentHighlight}
              </p>
              <ul className="mt-3 list-disc list-inside text-sm text-muted-foreground space-y-1">
                {hub.healthNeeds.map((need) => (
                  <li key={need}>{need}</li>
                ))}
              </ul>
              {countySummary ? (
                <div className="mt-6 rounded-xl border border-[#0284C7]/30 bg-[#E0F2FE]/50 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold text-[#0A2540]">
                    <BarChart3 className="h-4 w-4" aria-hidden />
                    Medicare Intelligence dashboard
                  </p>
                  <p className="mt-1 text-sm text-[#1E293B]">
                    CMS-derived published enrollment, material contracts, and complaint-measure
                    context for {countySummary.displayName}.
                  </p>
                  <Link
                    href={`/data/counties/${countySummary.slug}`}
                    className="mt-2 inline-flex text-sm font-medium text-[#0284C7] underline-offset-2 hover:underline"
                  >
                    Open {countySummary.displayName} Medicare dashboard →
                  </Link>
                </div>
              ) : null}
            </section>

            {(curatedConfig || dbProviders.length > 0) && (
              <section>
                <h2 className="text-2xl font-bold mb-2">
                  {curatedConfig?.sectionTitle ?? `Verified research listings in ${hub.shortName}`}
                </h2>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  {curatedSummary ??
                    (verifiedCount > 0
                      ? `${verifiedCount} verified research listing${
                          verifiedCount === 1 ? '' : 's'
                        } for ${hub.shortName}. Independent research only — re-check state DOI before you enroll.`
                      : EMPTY_MARKET_COPY.section)}
                </p>
                {curatedConfig ? (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {curatedConfig.counties.map((county) => (
                      <span
                        key={county}
                        className="rounded-full border border-trust/30 bg-trust/5 px-3 py-1 text-xs font-semibold text-trust"
                      >
                        {county}
                      </span>
                    ))}
                    {curatedConfig.badges?.map((badge) => (
                      <span
                        key={badge}
                        className="rounded-full border px-3 py-1 text-xs font-semibold text-muted-foreground"
                      >
                        {badge}
                      </span>
                    ))}
                  </div>
                ) : null}
                {inventoryScope ? (
                  <p className="mb-4 rounded-lg border border-amber-200/80 bg-amber-50/50 px-3 py-2 text-xs text-muted-foreground leading-relaxed">
                    {inventoryScope}
                  </p>
                ) : null}
                {dbProviders.length > 0 || verifiedCount > 0 ? (
                  <>
                    <div className="mb-4 rounded-xl border bg-card p-4 shadow-sm">
                      <p className="text-sm font-semibold text-foreground">
                        {verifiedCount.toLocaleString()} verified research agenc
                        {verifiedCount === 1 ? 'y' : 'ies'} in this market
                      </p>
                      {isCapped ? (
                        <p className="mt-1 text-sm text-muted-foreground">
                          Showing {showingCount.toLocaleString()} of{' '}
                          {verifiedCount.toLocaleString()} on this page
                          {pageSize ? ` (${pageSize} per page)` : ''}
                          {inventoryTotalPages > 1
                            ? ` · page ${inventoryPage} of ${inventoryTotalPages}`
                            : ''}
                          .
                        </p>
                      ) : null}
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                        Independent research only — re-check {regulatorLabel} before you enroll.
                        Counts are verified research listings only
                        {isTexasHub || isNewJerseyHub || isOhioHub || isNorthCarolinaHub
                          ? '. Agency/business entities only; not a bulk individual agent list.'
                          : '.'}
                      </p>
                    </div>
                    {verifiedCount > 0 ? (
                      <HubSpecialtyFilter
                        basePath={path}
                        active={loaFilter}
                        note={
                          isTexasHub
                            ? 'Specialty tags come from Texas TDI license types / qualifications when mapped. Shareable URL uses ?loa=. Medicare-certified is never inferred from TDI alone.'
                            : isOhioHub
                              ? 'Specialty tags come from Ohio ODI license types / lines of authority when mapped. Shareable URL uses ?loa=. Medicare-certified is never inferred from ODI alone.'
                              : isNewJerseyHub
                                ? 'Specialty tags come from New Jersey DOBI organization lines / qualifications when mapped. Shareable URL uses ?loa=. Medicare-certified is never inferred from DOBI alone.'
                                : isNorthCarolinaHub
                                  ? 'Specialty tags come from North Carolina DOI / SBS license types / lines of authority when mapped. Shareable URL uses ?loa=. Medicare-certified is never inferred from NC DOI alone.'
                                  : undefined
                        }
                      />
                    ) : null}
                    {loaFilter !== 'all' ? (
                      <p className="mb-4 text-sm text-muted-foreground">
                        Specialty filter applied to this page: {showingCount.toLocaleString()} match
                        {showingCount === 1 ? '' : 'es'}
                        {dbProviders.length === 0
                          ? '. Try All specialties or another inventory page.'
                          : ' on the current page (filter is page-scoped and shareable via ?loa=).'}
                      </p>
                    ) : null}
                    <div className="grid gap-4 sm:grid-cols-2">
                      {dbProviders.map((p) => (
                        <ProviderCard key={p.id} provider={p} />
                      ))}
                    </div>
                    <HubInventoryPagination
                      basePath={path}
                      page={inventoryPage}
                      totalPages={inventoryTotalPages}
                      total={verifiedCount}
                      pageSize={pageSize}
                      loaFilter={loaFilter}
                    />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">{EMPTY_MARKET_COPY.section}</p>
                )}
              </section>
            )}

            <section>
              <h2 className="text-2xl font-bold mb-2">
                Health insurance research listings in {hub.shortName}
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                {healthProviders.length > 0
                  ? isOhioHub
                    ? 'Agencies that meet our public research standard (Ohio Department of Insurance–verified). Medicare specialty is never inferred from ODI alone.'
                    : isTexasHub
                      ? 'Agencies that meet our public research standard (Texas TDI–verified when listed). Medicare specialty is never inferred from TDI alone.'
                      : isNewJerseyHub
                        ? 'Agencies that meet our public research standard (New Jersey DOBI–verified when listed). Medicare specialty is never inferred from DOBI alone.'
                        : isNorthCarolinaHub
                          ? 'Agencies that meet our public research standard (North Carolina DOI–verified when listed). Medicare specialty is never inferred from NC DOI alone.'
                          : 'Agencies that meet our public research standard (Florida DFS–verified when listed). Medicare specialty is never inferred from DFS alone.'
                  : EMPTY_MARKET_COPY.health}
              </p>
              {healthProviders.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {healthProviders.map((p) => (
                    <ProviderCard key={p.id} provider={p} />
                  ))}
                </div>
              ) : (
                <p className="rounded-xl border border-dashed bg-muted/30 px-4 py-6 text-sm text-muted-foreground">
                  {EMPTY_MARKET_COPY.health} Use{' '}
                  <a href="/tools/license-verification" className="text-primary hover:underline">
                    license verification
                  </a>{' '}
                  and state DOI tools while we expand verified research inventory.
                </p>
              )}
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-2">Multi-line agencies</h2>
              <p className="text-sm text-muted-foreground mb-6">
                {otherProviders.length > 0
                  ? `Verified research listings serving ${hub.msaName}`
                  : EMPTY_MARKET_COPY.multiLine}
              </p>
              {otherProviders.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  {otherProviders.map((p) => (
                    <ProviderCard key={p.id} provider={p} />
                  ))}
                </div>
              ) : null}
            </section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <HubMatchForm
              hubName={hub.shortName}
              hasVerifiedListings={stats.totalAgents > 0}
            />
            <div className="rounded-xl border bg-secondary/30 p-5 text-sm space-y-3">
              <h3 className="font-semibold">Why Local Matters</h3>
              <p className="text-muted-foreground text-xs leading-relaxed">
                State licensing, network adequacy, and subsidy rules vary by county. Local agents in{' '}
                {hub.shortName} understand {hub.stateName} DOI requirements and carrier appointments
                specific to your ZIP code.
              </p>
              <div className="flex flex-wrap gap-2">
                {['Independent research', 'Re-check DOI', 'No paid placements', 'No lead fees'].map((badge) => (
                  <span
                    key={badge}
                    className="rounded-full bg-trust/10 text-trust text-[10px] font-semibold px-2 py-0.5"
                  >
                    {badge}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-xl border p-5 text-sm">
              <h3 className="font-semibold mb-2">Specialty filters</h3>
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                Use LOA chips above the listings, or open the directory with a specialty.
              </p>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['Health', 'Health'],
                    ['Life', 'Life'],
                    ['Property & Casualty', 'Property & Casualty'],
                    ['Personal Lines', 'Personal Lines'],
                    ['Agency', 'Agency'],
                    ['Title', 'Title'],
                  ] as const
                ).map(([label, specialty]) => (
                  <Link
                    key={label}
                    href={`/directory?state=${hub.stateCode}&specialty=${encodeURIComponent(specialty)}&verified=true`}
                    className="rounded-full border px-2.5 py-1 text-xs hover:bg-primary/5"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>

      <HowItWorks />
      <DisclaimerBanner />
    </>
  );
}