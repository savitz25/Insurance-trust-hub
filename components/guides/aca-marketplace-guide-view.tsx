import Link from 'next/link';
import {
  ArrowRight,
  ExternalLink,
  MapPin,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { AcaMarketplaceGuide } from '@/lib/guides/aca-marketplace-guides';
import { MARKETPLACE_FLAGSHIP_PATH } from '@/lib/guides/aca-marketplace-guides';
import { Button } from '@/components/ui/button';
import { ContextNav } from '@/components/context-nav';
import { DisclaimerBanner } from '@/components/disclaimer-banner';

type Props = {
  guide: AcaMarketplaceGuide;
};

export function AcaMarketplaceGuideView({ guide }: Props) {
  const path = `/guides/${guide.slug}`;

  return (
    <>
      {/* Hero */}
      <div className="border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50 to-[#E0F2FE]/35">
        <div className="container mx-auto max-w-3xl px-4 py-10 md:py-14">
          <ContextNav pathname={path} currentLabel={guide.locationLabel} className="mb-5" />
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#0284C7]">
            <MapPin className="h-3.5 w-3.5" aria-hidden />
            ACA Marketplace guide · {guide.stateName}
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            {guide.h1}
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-slate-600 md:text-lg">
            {guide.subhead}
          </p>
          <p className="mt-4 inline-flex max-w-2xl items-start gap-2 rounded-xl border border-[#0284C7]/30 bg-white/80 px-3 py-2 text-sm text-[#0A2540]">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            Educational research only — not HealthCare.gov, not enrollment, no lead selling.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild className="min-h-[44px] gap-1">
              <Link href={MARKETPLACE_FLAGSHIP_PATH}>
                Research Marketplace plans near you
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
            <Button asChild variant="outline" className="min-h-[44px]">
              <Link href="/calculators/aca-subsidy">ACA subsidy education</Link>
            </Button>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1">
              <Sparkles className="h-3.5 w-3.5 text-[#0284C7]" aria-hidden />
              Independent
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
              CMS landscape when available
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1">
              Verify on HealthCare.gov
            </span>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl space-y-12 px-4 py-10 md:py-14">
        {/* Local overview */}
        <section>
          <h2 className="text-xl font-semibold text-slate-900">
            Local market overview: {guide.locationLabel}
          </h2>
          <div className="mt-4 space-y-3 text-sm leading-relaxed text-slate-600">
            {guide.overview.map((p) => (
              <p key={p.slice(0, 48)}>{p}</p>
            ))}
          </div>
          <h3 className="mt-6 text-base font-semibold text-slate-900">
            Who often researches Marketplace coverage here
          </h3>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-slate-600">
            {guide.whoBuys.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        {/* ZIP CTA block */}
        <section className="rounded-2xl border border-[#0284C7]/25 bg-[#E0F2FE]/40 p-5 md:p-6">
          <h2 className="text-lg font-semibold text-slate-900">
            Enter your ZIP to see the local plan landscape
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Open our live Marketplace plan research tool, enter a ZIP for {guide.locationLabel}, and
            review plan counts, issuer depth, and research paths when CMS data is available.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {guide.sampleZips.map((z) => (
              <Link
                key={z.zip}
                href={MARKETPLACE_FLAGSHIP_PATH}
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-[#0284C7]/40 hover:text-[#0A2540]"
              >
                Example: {z.zip}
                <span className="text-slate-500"> · {z.label}</span>
              </Link>
            ))}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Example ZIPs are starting points only — use the ZIP where you live and seek care.
          </p>
          <Button asChild className="mt-4 min-h-[44px] gap-1">
            <Link href={MARKETPLACE_FLAGSHIP_PATH}>
              Research Marketplace plans near you
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </Button>
        </section>

        {/* What tool shows */}
        <section>
          <h2 className="text-xl font-semibold text-slate-900">What the research tool shows</h2>
          <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-slate-600">
            {guide.whatToolShows.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-slate-600">
            Path cards illustrate lower-premium, balanced, and higher-protection styles when CMS
            returns enough data. They are educational examples — not rankings or enrollment offers.
          </p>
        </section>

        {/* Cost factors */}
        <section>
          <h2 className="text-xl font-semibold text-slate-900">What affects cost here</h2>
          <ul className="mt-3 list-inside list-disc space-y-1.5 text-sm text-slate-600">
            {guide.costFactors.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link
              href="/tools/cost-estimator"
              className="font-medium text-[#0284C7] hover:underline"
            >
              Cost &amp; Coverage Planner
            </Link>
            <Link
              href="/calculators/aca-subsidy"
              className="font-medium text-[#0284C7] hover:underline"
            >
              ACA Coverage &amp; Savings Planner
            </Link>
            <Link
              href={MARKETPLACE_FLAGSHIP_PATH}
              className="font-medium text-[#0284C7] hover:underline"
            >
              Local plan landscape tool
            </Link>
          </div>
        </section>

        {/* Trust next steps */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 md:p-6">
          <h2 className="text-lg font-semibold text-slate-900">Trust &amp; next steps</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-relaxed text-slate-600">
            <li>
              Run ZIP research on the{' '}
              <Link href={MARKETPLACE_FLAGSHIP_PATH} className="font-medium text-[#0284C7] hover:underline">
                Marketplace plan research
              </Link>{' '}
              tool and optionally save a summary to My Insurance.
            </li>
            <li>
              Read how we source data on our{' '}
              <Link href="/methodology" className="font-medium text-[#0284C7] hover:underline">
                methodology
              </Link>{' '}
              page.
            </li>
            <li>
              Browse{' '}
              <Link href={guide.hubHref} className="font-medium text-[#0284C7] hover:underline">
                {guide.hubLabel}
              </Link>{' '}
              or the{' '}
              <Link href={guide.directoryHref} className="font-medium text-[#0284C7] hover:underline">
                ACA specialists hub
              </Link>{' '}
              when you want human help — re-check licenses with {guide.licenseRegulator}.
            </li>
            <li>
              Complete official eligibility, pricing, and enrollment on{' '}
              <a
                href="https://www.healthcare.gov"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-medium text-[#0284C7] hover:underline"
              >
                HealthCare.gov
                <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              </a>
              .
            </li>
          </ol>
          {(guide.medicareCountyHref || guide.marketplaceCountyHref) && (
            <p className="mt-4 text-sm text-slate-600">
              Related local data:{' '}
              {guide.marketplaceCountyHref ? (
                <Link
                  href={guide.marketplaceCountyHref}
                  className="font-medium text-[#0284C7] hover:underline"
                >
                  County ACA intelligence
                </Link>
              ) : null}
              {guide.marketplaceCountyHref && guide.medicareCountyHref ? ' · ' : null}
              {guide.medicareCountyHref ? (
                <Link
                  href={guide.medicareCountyHref}
                  className="font-medium text-[#0284C7] hover:underline"
                >
                  Medicare county dashboard
                </Link>
              ) : null}
              {' · '}
              <Link
                href="/data/plan-complaint-index"
                className="font-medium text-[#0284C7] hover:underline"
              >
                Plan Complaint Index
              </Link>
            </p>
          )}
        </section>

        {/* FAQ */}
        <section>
          <h2 className="text-xl font-semibold text-slate-900">FAQ</h2>
          <dl className="mt-4 space-y-4">
            {guide.faqs.map((f) => (
              <div key={f.q} className="rounded-xl border border-slate-200 bg-white p-4">
                <dt className="font-semibold text-slate-900">{f.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-slate-600">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* Related guides */}
        <section>
          <h2 className="text-lg font-semibold text-slate-900">Related Marketplace guides</h2>
          <ul className="mt-3 flex flex-wrap gap-2 text-sm">
            {guide.relatedGuides.map((slug) => (
              <li key={slug}>
                <Link
                  href={`/guides/${slug}`}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-[#0284C7] hover:border-[#0284C7]/40"
                >
                  {slug
                    .replace(/-aca-marketplace$/, '')
                    .split('-')
                    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
                    .join(' ')}
                </Link>
              </li>
            ))}
            <li>
              <Link
                href="/guides"
                className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:border-slate-300"
              >
                All guides
              </Link>
            </li>
          </ul>
        </section>
      </div>

      <DisclaimerBanner />
    </>
  );
}
