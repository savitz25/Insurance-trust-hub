import Link from 'next/link';
import { ArrowRight, BookOpen, MapPin, Shield } from 'lucide-react';
import { HeroSearch } from '@/components/hero-search';
import { TrustBar } from '@/components/trust-bar';
import { HowItWorks } from '@/components/how-it-works';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { JsonLd } from '@/lib/seo/json-ld';
import { buildHomepageGraph } from '@/lib/seo/schemas';
import { DESTINATION_STATES } from '@/lib/destinations/data';
import { ARTICLES } from '@/lib/resources/articles';
import { INSURANCE_TYPES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function HomePage() {
  const popularDestinations = DESTINATION_STATES.slice(0, 6);
  const featuredArticles = ARTICLES.slice(0, 3);
  const categories = INSURANCE_TYPES.slice(0, 6);

  return (
    <>
      <JsonLd data={buildHomepageGraph()} />

      <section className="relative overflow-hidden border-b bg-gradient-to-b from-secondary/50 to-background">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl mx-auto text-center">
            <p className="text-xs font-semibold tracking-[0.2em] text-trust uppercase mb-4">
              Independent insurance directory
            </p>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-[1.1]">
              Find trusted insurance agents near you
            </h1>
            <p className="mt-5 text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto">
              Compare licensed agencies by reviews, specialties, and state licensing. Get free
              quotes for auto, home, life, and business coverage.
            </p>
            <div className="mt-10 flex justify-center">
              <HeroSearch />
            </div>
          </div>
        </div>
      </section>

      <TrustBar />

      <HowItWorks />

      <section className="py-16 md:py-20 border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="section-heading">Popular destinations</h2>
              <p className="mt-2 text-muted-foreground max-w-xl">
                Moving or shopping coverage in a new state? Explore local insurance landscapes and
                find agencies that serve your area.
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/destinations" className="gap-2">
                All destinations <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {popularDestinations.map((dest) => (
              <Link key={dest.slug} href={`/destinations/${dest.slug}`}>
                <Card className="h-full hover:shadow-trust-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary shrink-0">
                        <MapPin className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">{dest.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                          {dest.tagline}
                        </p>
                        <p className="mt-2 text-xs text-primary font-medium">
                          {dest.cities.length} cities · View guide →
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-muted/20 border-t">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="section-heading">Browse by coverage type</h2>
            <p className="mt-2 text-muted-foreground">
              Filter our directory by the insurance products you need.
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {categories.map((cat) => (
              <Link
                key={cat.value}
                href={`/directory?type=${cat.value}`}
                className="stat-card hover:shadow-trust-lg transition-shadow text-center py-5"
              >
                <Shield className="h-5 w-5 text-primary mx-auto mb-2" />
                <span className="text-sm font-medium">{cat.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 border-t">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
            <div>
              <h2 className="section-heading">Insurance guides & resources</h2>
              <p className="mt-2 text-muted-foreground max-w-xl">
                Educational articles to help you choose agents, understand coverage, and verify
                licensing.
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/resources" className="gap-2">
                All guides <BookOpen className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {featuredArticles.map((article) => (
              <Link key={article.slug} href={`/resources/${article.slug}`}>
                <Card className="h-full hover:shadow-trust-lg transition-shadow">
                  <CardContent className="pt-6">
                    <span className="text-xs font-medium text-trust uppercase tracking-wide">
                      {article.category}
                    </span>
                    <h3 className="mt-2 font-semibold text-lg leading-snug">{article.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                      {article.description}
                    </p>
                    <p className="mt-3 text-xs text-muted-foreground">{article.readTime} read</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <DisclaimerBanner />
    </>
  );
}