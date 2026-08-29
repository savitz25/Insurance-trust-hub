import type { Metadata } from 'next';
import Link from 'next/link';
import { ContextNav } from '@/components/context-nav';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { JsonLd } from '@/lib/seo/json-ld';
import { buildMetadata } from '@/lib/seo/metadata';
import { buildResearchPageGraph } from '@/lib/seo/research-seo';
import {
  INS_INSURER_006_ROUTE,
  LEGAL_INSURER_NOT_BRAND,
  PILOT_LANDING_H1,
  PILOT_SIZE_COPY,
  UNPUBLISHED_COPY,
  UNPUBLISHED_EXISTS_COPY,
  findUnpublishedIdentity,
  insurerProfilePath,
  listPublishedInsurers,
  searchPublishedInsurers,
} from '@/lib/national/legal-insurer-pilot';

type Props = { searchParams: Promise<{ q?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  return buildMetadata({
    title: 'Research legal insurance companies | InsuranceTrustHub',
    description:
      'Search exact legal insurers by company name or NAIC company code and review official regulatory examination evidence where InsuranceTrustHub has deterministically matched it.',
    path: INS_INSURER_006_ROUTE,
    noIndex: Boolean(q && q.trim()),
  });
}

export default async function InsurersLandingPage({ searchParams }: Props) {
  const { q: raw } = await searchParams;
  const q = String(raw || '').trim();
  const publishedHits = q ? searchPublishedInsurers(q) : [];
  const unpublished = q && publishedHits.length === 0 ? findUnpublishedIdentity(q) : null;
  const catalog = listPublishedInsurers();
  const jsonLd = buildResearchPageGraph({
    path: INS_INSURER_006_ROUTE,
    name: PILOT_LANDING_H1,
    description:
      'Search exact legal insurers by company name or NAIC company code and review official regulatory examination evidence.',
    breadcrumbs: [
      { name: 'Home', path: '/' },
      { name: 'Legal insurers', path: INS_INSURER_006_ROUTE },
    ],
  });

  return (
    <>
      <JsonLd data={jsonLd} />
      <div className="border-b bg-muted/20">
        <div className="container mx-auto max-w-3xl px-4 py-8 md:py-12">
          <ContextNav pathname={INS_INSURER_006_ROUTE} currentLabel="Legal insurers" className="mb-4" />
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0284C7]">Legal insurer research</p>
          <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight text-[#0A2540]">{PILOT_LANDING_H1}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground leading-relaxed">
            Search exact legal insurers by company name or NAIC company code and review official regulatory
            examination evidence where InsuranceTrustHub has deterministically matched it.
          </p>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground leading-relaxed">{LEGAL_INSURER_NOT_BRAND}</p>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-8 space-y-8">
        <form action={INS_INSURER_006_ROUTE} method="get" role="search" className="space-y-2">
          <label htmlFor="insurer-q" className="block text-sm font-medium text-[#0A2540]">
            Search by legal company name or NAIC company code
          </label>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              id="insurer-q"
              name="q"
              type="search"
              defaultValue={q}
              autoComplete="off"
              enterKeyHint="search"
              className="min-h-11 flex-1 rounded-md border border-input bg-background px-3 py-2 text-base md:text-sm"
              placeholder="Example: 21652 or Farmers Insurance Exchange"
            />
            <button
              type="submit"
              className="min-h-11 min-w-11 rounded-md bg-[#0A2540] px-4 text-sm font-medium text-white hover:bg-[#0A2540]/90"
            >
              Search
            </button>
          </div>
        </form>

        {q ? (
          <section aria-live="polite" className="space-y-3">
            <h2 className="text-lg font-semibold text-[#0A2540]">Search results</h2>
            {publishedHits.length > 0 ? (
              <ul className="space-y-2">
                {publishedHits.map((hit) => (
                  <li key={hit.entityId}>
                    <Link
                      href={insurerProfilePath(hit.slug)}
                      className="block rounded-lg border bg-card p-4 hover:border-primary/40 min-h-11"
                    >
                      <p className="font-semibold text-[#0A2540]">{hit.legalName}</p>
                      <p className="text-sm text-muted-foreground mt-0.5">NAIC Company Code: {hit.naicCode}</p>
                      <p className="text-xs text-muted-foreground mt-1">Published examination evidence available</p>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : unpublished ? (
              <div className="rounded-lg border bg-muted/20 p-4 space-y-2">
                <p className="text-sm">{UNPUBLISHED_COPY}</p>
                <p className="text-sm text-muted-foreground">{UNPUBLISHED_EXISTS_COPY}</p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{UNPUBLISHED_COPY}</p>
            )}
          </section>
        ) : null}

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-[#0A2540]">Why this surface is small</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            InsuranceTrustHub currently publishes legal-insurer profiles only where exact NAIC identity and useful
            public regulatory evidence have both been established. {PILOT_SIZE_COPY} 26 is a publication-evidence
            cohort, not &quot;26 approved insurers.&quot;
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-[#0A2540]">Published research profiles</h2>
          <ul className="divide-y rounded-lg border">
            {catalog.map((row) => (
              <li key={row.entity_id}>
                <Link href={insurerProfilePath(row.slug)} className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-1 p-3 min-h-11 hover:bg-muted/30">
                  <span className="font-medium text-[#0A2540]">{row.canonical_legal_name}</span>
                  <span className="text-sm text-muted-foreground">NAIC {row.naic_cocode}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <DisclaimerBanner />
    </>
  );
}
