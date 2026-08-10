import Link from 'next/link';
import { Shield, MapPin, Users, Star, BarChart3 } from 'lucide-react';
import type { InsuranceHub } from '@/types/agent';
import { getAgentsForHub, getFeaturedHealthAgents, getHubStats } from '@/lib/hubs/agents';
import { getCuratedHubConfig } from '@/lib/hubs/data/curated-hubs';
import { getAllCountySummaries } from '@/lib/insurance/cms/county-summaries';
import { AgentCard } from '@/components/agent-card';
import { HubAgentTable } from '@/components/hub-agent-table';
import { ZipSearch } from '@/components/zip-search';
import { HubMatchForm } from '@/components/hub-match-form';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { HowItWorks } from '@/components/how-it-works';
import { JsonLd } from '@/lib/seo/json-ld';
import { SITE_URL } from '@/lib/constants';
import { ContextNav } from '@/components/context-nav';

interface HubPageViewProps {
  hub: InsuranceHub;
  canonicalPath?: string;
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
};

export function HubPageView({ hub, canonicalPath }: HubPageViewProps) {
  const { stateSlug: state, slug } = hub;
  const path = canonicalPath ?? `/hubs/${state}/${slug}`;
  const allAgents = getAgentsForHub(hub);
  const healthAgents = getFeaturedHealthAgents(hub);
  const otherAgents = allAgents.filter((a) => !a.isHealthFeatured);
  const stats = getHubStats(hub);
  const curatedConfig = getCuratedHubConfig(hub.slug);
  const countyDashboardSlug = COUNTY_DASHBOARD_BY_HUB_SLUG[slug];
  const countySummary = countyDashboardSlug
    ? getAllCountySummaries().find((c) => c.slug === countyDashboardSlug)
    : undefined;
  const acaGuideLinks = ACA_GUIDE_LINKS_BY_HUB[slug];

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: hub.metaTitle,
    description: hub.metaDescription,
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
            Independent research · Re-check state licenses
          </p>
          <h1 className="text-3xl md:text-5xl font-bold max-w-4xl mx-auto">
            Research insurance agencies in {hub.shortName}
          </h1>
          <p className="mt-2 text-lg text-primary-foreground/80">
            Licensed agencies with re-checkable public records for {hub.localDescriptor}
          </p>
          <p className="mt-4 text-sm text-primary-foreground/70 max-w-2xl mx-auto">
            {stats.totalAgents} agencies listed · {stats.healthSpecialists} health-focused ·{' '}
            {stats.verified} with re-checkable verified license numbers
            {stats.seedInventory
              ? ' · Research inventory may be incomplete — missing data is better than invented verification'
              : ''}
          </p>
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
                      : 'Score suppressed (seed/incomplete)'}
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

            {curatedConfig && (
              <section>
                <h2 className="text-2xl font-bold mb-2">{curatedConfig.sectionTitle}</h2>
                <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                  {curatedConfig.summary}
                </p>
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
                <HubAgentTable agents={allAgents} hubName={hub.shortName} />
              </section>
            )}

            <section>
              <h2 className="text-2xl font-bold mb-2">
                Health Insurance Specialists in {hub.shortName}
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                {curatedConfig?.featuredHealthLine ??
                  '60% health emphasis · Featured Medicare/ACA agencies · Diverse-population brokers'}
              </p>
              <div className="space-y-5">
                {healthAgents.map((agent, i) => (
                  <AgentCard key={agent.id} agent={agent} rank={i + 1} hubLabel={hub.shortName} />
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-2">Full Directory — Multi-Line Agencies</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Home, auto, life, and commercial partners serving {hub.msaName}
              </p>
              <div className="space-y-5">
                {otherAgents.map((agent, i) => (
                  <AgentCard
                    key={agent.id}
                    agent={agent}
                    rank={healthAgents.length + i + 1}
                    hubLabel={hub.shortName}
                  />
                ))}
              </div>
            </section>
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <HubMatchForm hubName={hub.shortName} />
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
              <h3 className="font-semibold mb-2">Filter by Coverage</h3>
              <div className="flex flex-wrap gap-2">
                {['Health/Medicare/ACA', 'Auto', 'Home', 'Life', 'Commercial', 'Independent'].map(
                  (f) => (
                    <Link
                      key={f}
                      href={`/directory?state=${hub.stateCode}&q=${encodeURIComponent(f.split('/')[0])}`}
                      className="rounded-full border px-2.5 py-1 text-xs hover:bg-primary/5"
                    >
                      {f}
                    </Link>
                  )
                )}
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