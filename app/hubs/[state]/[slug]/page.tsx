import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Shield, MapPin, Users, Star } from 'lucide-react';
import { getHubBySlug, getAllHubParams } from '@/lib/hubs/registry';
import { getAgentsForHub, getFeaturedHealthAgents, getHubStats } from '@/lib/hubs/agents';
import { AgentCard } from '@/components/agent-card';
import { ZipSearch } from '@/components/zip-search';
import { HubMatchForm } from '@/components/hub-match-form';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { JsonLd } from '@/lib/seo/json-ld';
import { SITE_URL } from '@/lib/constants';

export const dynamic = 'force-static';

export function generateStaticParams() {
  return getAllHubParams();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ state: string; slug: string }>;
}): Promise<Metadata> {
  const { state, slug } = await params;
  const hub = getHubBySlug(state, slug);
  if (!hub) return { title: 'Insurance Hub | Insurance Trust Hub' };

  return {
    title: hub.metaTitle,
    description: hub.metaDescription,
    alternates: { canonical: `${SITE_URL}/hubs/${state}/${slug}` },
    openGraph: {
      title: hub.metaTitle,
      description: hub.metaDescription,
      url: `${SITE_URL}/hubs/${state}/${slug}`,
    },
  };
}

export default async function HubPage({
  params,
}: {
  params: Promise<{ state: string; slug: string }>;
}) {
  const { state, slug } = await params;
  const hub = getHubBySlug(state, slug);
  if (!hub) notFound();

  const allAgents = getAgentsForHub(hub);
  const healthAgents = getFeaturedHealthAgents(hub);
  const otherAgents = allAgents.filter((a) => !a.isHealthFeatured);
  const stats = getHubStats(hub);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: hub.metaTitle,
    description: hub.metaDescription,
    url: `${SITE_URL}/hubs/${state}/${slug}`,
    about: {
      '@type': 'Place',
      name: hub.msaName,
      address: { '@type': 'PostalAddress', addressRegion: hub.stateCode, addressCountry: 'US' },
    },
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      <nav className="container mx-auto px-4 pt-6 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        {' / '}
        <Link href="/hubs" className="hover:text-foreground">Health Insurance Hubs</Link>
        {' / '}
        <Link href={`/hubs/${state}`} className="hover:text-foreground">{hub.stateName}</Link>
        {' / '}
        <span className="text-foreground">{hub.shortName}</span>
      </nav>

      <section className="border-b bg-gradient-to-br from-primary to-primary/80 py-14 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm">
            <Shield className="h-4 w-4" />
            DOI Verified · NAIC Data · No Paid Placements
          </p>
          <h1 className="text-3xl md:text-5xl font-bold max-w-4xl mx-auto">
            Top Verified Insurance Agents in {hub.shortName}
          </h1>
          <p className="mt-2 text-lg text-primary-foreground/80">
            Health Insurance Experts Serving {hub.localDescriptor}
          </p>
          <p className="mt-4 text-sm text-primary-foreground/70 max-w-2xl mx-auto">
            {stats.totalAgents} agencies · {stats.healthSpecialists} health specialists · Avg trust
            score {stats.avgTrustScore}/100 · {stats.totalReviews.toLocaleString()} reviews analyzed
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
                  <p className="text-lg font-bold">{stats.avgTrustScore}/100</p>
                  <p className="text-xs text-muted-foreground">Avg trust score</p>
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
            </section>

            <section>
              <h2 className="text-2xl font-bold mb-2">
                Health Insurance Specialists in {hub.shortName}
              </h2>
              <p className="text-sm text-muted-foreground mb-6">
                60% health emphasis · Featured Medicare/ACA agencies · Diverse-population brokers
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
                {['DOI Verified', 'NAIC Data', 'BBB Rated', 'No Paid Ads'].map((badge) => (
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

      <DisclaimerBanner />
    </>
  );
}