import Link from 'next/link';
import type { Metadata } from 'next';
import { BookOpen, Clock } from 'lucide-react';
import { ARTICLES } from '@/lib/resources/articles';
import { buildMetadata } from '@/lib/seo/metadata';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = buildMetadata({
  title: 'Insurance Guides & Resources — Educational Articles',
  description:
    'Free guides on choosing agents, auto and home insurance, flood coverage, renters policies, and more.',
  path: '/resources',
});

export default function ResourcesPage() {
  const categories = [...new Set(ARTICLES.map((a) => a.category))];

  return (
    <div className="container mx-auto px-4 py-10 md:py-14">
      <div className="max-w-3xl mb-12">
        <h1 className="section-heading flex items-center gap-3">
          <BookOpen className="h-8 w-8 text-primary" />
          Insurance resources
        </h1>
        <p className="mt-3 text-muted-foreground leading-relaxed">
          Educational guides to help you research coverage, compare agents, and verify licensing.
          Insurance Trust Hub does not sell insurance — we connect you with licensed professionals.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {categories.map((cat) => (
          <Badge key={cat} variant="secondary">
            {cat}
          </Badge>
        ))}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ARTICLES.map((article) => (
          <Link key={article.slug} href={`/resources/${article.slug}`}>
            <Card className="h-full hover:shadow-trust-lg transition-shadow">
              <CardContent className="pt-6">
                <Badge variant="outline" className="text-[10px]">
                  {article.category}
                </Badge>
                <h2 className="mt-3 font-semibold text-lg leading-snug">{article.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-3">
                  {article.description}
                </p>
                <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {article.readTime} · Updated {article.updatedAt}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}