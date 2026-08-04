import Link from 'next/link';
import { ArrowRight, BookOpen, MapPin, Shield, Calculator } from 'lucide-react';
import { ZipSearch } from '@/components/zip-search';
import { TrustBar } from '@/components/trust-bar';
import { HowItWorks } from '@/components/how-it-works';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { HeroProtectChips } from '@/components/hero-protect-chips';
import { NetworkBelongingLine } from '@/components/network/network-belonging-line';
import { TrustMark } from '@/components/network/trust-mark';
import { JsonLd } from '@/lib/seo/json-ld';
import { buildHomepageGraph } from '@/lib/seo/schemas';
import { getTopHubs } from '@/lib/hubs/registry';
import { ARTICLES } from '@/lib/resources/articles';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function HomePage() {
  const topHubs = getTopHubs(6);
  const featuredArticles = ARTICLES.slice(0, 3);

  return (
    <>
      <JsonLd data={buildHomepageGraph()} />

      <section className="relative overflow-hidden border-b bg-gradient-to-br from-primary/5 via-background to-trust/5">
        <div className="container mx-auto px-4 py-14 md:py-20">
          <div className="max-w-4xl mx-auto text-center">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-trust/20 bg-trust/10 px-4 py-1.5 text-sm font-semibold text-trust">
              <Shield className="h-4 w-4" aria-hidden="true" />
              INDEPENDENT DOI RESEARCH · NO PAID PLACEMENTS · NO PAY-TO-RANK
            </div>
            <NetworkBelongingLine className="mb-3" />
            <div className="mb-5 flex justify-center">
              <TrustMark />
            </div>

            <h1 className="text-4xl font-bold leading-[1.1] tracking-tight text-foreground md:text-5xl lg:text-6xl">
              What are you trying to protect?
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              Choose what matters, then research state-licensed agencies and educational tools.
              Confirm Active status and lines of authority on DOI / NAIC pathways before you enroll.
              We do not sell policies or operate a quote marketplace.
            </p>

            <div className="mt-8">
              <HeroProtectChips />
            </div>

            <div className="mt-10 flex justify-center">
              <div className="w-full max-w-md">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Or search agents by ZIP
                </p>
                <ZipSearch />
              </div>
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              Expanding state &amp; metro coverage · License research · ACA &amp; Medicare education
            </p>

            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button size="lg" variant="trust" asChild className="gap-2 min-h-11">
                <Link href="/directory">
                  Browse agent directory <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="gap-2 min-h-11">
                <Link href="/calculators">
                  Educational calculators <Calculator className="h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="min-h-11">
                <Link href="/methodology">Methodology</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <TrustBar />

      <HowItWorks />

      <section className="border-y py-10 bg-card">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-4 md:gap-8 text-sm text-muted-foreground">
            {[
              'State DOI License Verification',
              'NAIC Public Records',
              'BBB Ratings',
              'Attributed Reviews',
              'No Paid Placements',
            ].map((item) => (
              <span key={item} className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-trust" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="section-heading">Health Insurance Hubs</h2>
              <p className="mt-2 max-w-xl text-muted-foreground">
                Market hubs for researching licensed agencies with health coverage focus (ACA,
                Medicare, multi-line). Coverage is expanding — not every U.S. county is listed.
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/hubs" className="gap-2">
                All hubs <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {topHubs.map((hub) => (
              <Link key={hub.slug} href={`/hubs/${hub.stateSlug}/${hub.slug}`}>
                <Card className="h-full hover:shadow-trust-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-lg">{hub.shortName}</h3>
                        <p className="text-xs text-muted-foreground">{hub.stateName}</p>
                      </div>
                      <Badge variant="success" className="text-[10px]">Health Hub</Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                      {hub.enrollmentHighlight}
                    </p>
                    <p className="mt-3 text-xs text-primary font-medium flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      Health specialists →
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 border-t bg-secondary/20">
        <div className="container mx-auto px-4">
          <h2 className="section-heading mb-8">Guides & Resources</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {featuredArticles.map((article) => (
              <Link key={article.slug} href={`/resources/${article.slug}`}>
                <Card className="h-full hover:shadow-trust-lg transition-shadow">
                  <CardContent className="pt-6">
                    <BookOpen className="h-5 w-5 text-primary mb-3" />
                    <h3 className="font-semibold">{article.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-2">{article.description}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
          <div className="mt-8 text-center">
            <Button variant="outline" asChild>
              <Link href="/resources">All resources</Link>
            </Button>
          </div>
        </div>
      </section>

      <DisclaimerBanner />
    </>
  );
}