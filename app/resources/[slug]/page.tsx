import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { format } from 'date-fns';
import { ArrowRight, Clock } from 'lucide-react';
import { ARTICLES, getAllArticleSlugs, getArticleBySlug } from '@/lib/resources/articles';
import { buildMetadata } from '@/lib/seo/metadata';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return getAllArticleSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) return { title: 'Article Not Found' };

  return buildMetadata({
    title: article.title,
    description: article.description,
    path: `/resources/${slug}`,
    type: 'article',
  });
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);
  if (!article) notFound();

  const related = ARTICLES.filter((a) => a.slug !== slug).slice(0, 3);

  return (
    <article>
      <div className="border-b bg-muted/20">
        <div className="container mx-auto px-4 py-10 md:py-14 max-w-3xl">
          <p className="text-xs font-semibold tracking-widest text-trust uppercase mb-2">
            {article.category}
          </p>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight leading-tight">
            {article.title}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            {article.description}
          </p>
          <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {article.readTime} · Published {format(new Date(article.publishedAt), 'MMMM d, yyyy')}
          </p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10 md:py-14">
        <div className="grid lg:grid-cols-[1fr_280px] gap-10 max-w-5xl mx-auto">
          <div className="prose prose-slate max-w-none">
            {article.sections.map((section) => (
              <section key={section.heading} className="mb-10">
                <h2 className="text-2xl font-semibold text-foreground mb-3">{section.heading}</h2>
                <p className="text-muted-foreground leading-relaxed">{section.content}</p>
                {section.bullets && (
                  <ul className="mt-4 space-y-2 list-disc pl-5 text-muted-foreground">
                    {section.bullets.map((b) => (
                      <li key={b} className="leading-relaxed">{b}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          <aside className="space-y-6 lg:sticky lg:top-24 lg:self-start">
            <Card className="border-trust/30 bg-trust/5">
              <CardContent className="pt-6">
                <h3 className="font-semibold">Find licensed agents</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Ready to compare quotes? Browse agencies in our independent directory.
                </p>
                <Button asChild className="mt-4 w-full gap-2">
                  <Link href="/directory">
                    Agency directory <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <div>
              <h3 className="text-sm font-semibold mb-3">Related links</h3>
              <ul className="space-y-2">
                {article.relatedLinks.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-primary hover:underline underline-offset-2"
                    >
                      {link.label} →
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </div>

        {related.length > 0 && (
          <section className="mt-16 max-w-5xl mx-auto border-t pt-12">
            <h2 className="text-xl font-semibold mb-6">More guides</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {related.map((a) => (
                <Link key={a.slug} href={`/resources/${a.slug}`}>
                  <Card className="h-full hover:shadow-trust transition-shadow">
                    <CardContent className="pt-5">
                      <p className="text-xs text-muted-foreground">{a.category}</p>
                      <h3 className="mt-1 font-medium text-sm leading-snug">{a.title}</h3>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </article>
  );
}