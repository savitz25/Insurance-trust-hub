import Link from 'next/link';
import { Shield, MapPin } from 'lucide-react';
import type { SpecialtyTopic } from '@/lib/hubs/specialty-topics';
import { getTopicFeaturedHubs, getSouthFloridaAgents } from '@/lib/hubs/specialty-topics';
import { AgentCard } from '@/components/agent-card';
import { ZipSearch } from '@/components/zip-search';
import { HowItWorks } from '@/components/how-it-works';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { JsonLd } from '@/lib/seo/json-ld';
import { SITE_URL } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/card';

interface SpecialtyTopicPageProps {
  topic: SpecialtyTopic;
}

export function SpecialtyTopicPage({ topic }: SpecialtyTopicPageProps) {
  const featuredHubs = getTopicFeaturedHubs(topic);
  const agents = topic.filterAgents(getSouthFloridaAgents());

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: topic.metaTitle,
    description: topic.metaDescription,
    url: `${SITE_URL}${topic.path}`,
  };

  return (
    <>
      <JsonLd data={jsonLd} />

      <nav className="container mx-auto px-4 pt-6 text-sm text-muted-foreground">
        <Link href="/" className="hover:text-foreground">Home</Link>
        {' / '}
        <Link href="/hubs" className="hover:text-foreground">Health Insurance Hubs</Link>
        {' / '}
        <span className="text-foreground">{topic.title}</span>
      </nav>

      <section className="border-b bg-gradient-to-br from-primary to-primary/80 py-14 text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm">
            <Shield className="h-4 w-4" />
            Verified · Independent · Licensed Only
          </p>
          <h1 className="text-3xl md:text-5xl font-bold max-w-4xl mx-auto">{topic.h1}</h1>
          <p className="mt-2 text-lg text-primary-foreground/80">{topic.subtitle}</p>
          <div className="mt-6 flex justify-center">
            <ZipSearch defaultZip="33101" className="[&_input]:bg-white [&_button]:bg-trust" />
          </div>
        </div>
      </section>

      <div className="container mx-auto px-4 py-10 space-y-12">
        <section className="max-w-3xl">
          <h2 className="text-2xl font-bold mb-4">Market Overview</h2>
          <p className="text-muted-foreground leading-relaxed">{topic.marketSnapshot}</p>
          <ul className="mt-4 list-disc list-inside text-sm text-muted-foreground space-y-1">
            {topic.healthNeeds.map((need) => (
              <li key={need}>{need}</li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-2">Featured {topic.title}</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Top verified agents from high-volume markets — FL DFS / state DOI verified
          </p>
          <div className="space-y-5">
            {agents.map((agent, i) => (
              <AgentCard key={agent.id} agent={agent} rank={i + 1} hubLabel="South Florida" />
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-6">Browse by Metro Market</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featuredHubs.map((hub) => (
              <Link key={`${hub.stateSlug}-${hub.slug}`} href={`/hubs/${hub.stateSlug}/${hub.slug}`}>
                <Card className="h-full hover:shadow-trust-lg transition-shadow">
                  <CardContent className="pt-5">
                    <h3 className="font-semibold">{hub.shortName}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{hub.stateName}</p>
                    <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{hub.enrollmentHighlight}</p>
                    <p className="mt-3 flex items-center gap-1 text-xs text-primary font-medium">
                      <MapPin className="h-3 w-3" />
                      View specialists →
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      </div>

      <HowItWorks />
      <DisclaimerBanner />
    </>
  );
}