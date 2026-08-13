import Link from 'next/link';
import { ArrowRight, BookOpen, Shield } from 'lucide-react';
import { ZipSearch } from '@/components/zip-search';
import { ConsumerJobPaths } from '@/components/consumer-job-paths';
import { Button } from '@/components/ui/button';
import {
  INSURANCE_BRAND,
  INSURANCE_HERO,
  INSURANCE_RADIUS,
  INSURANCE_SHADOW,
} from '@/lib/design/insurance-design-system';

/**
 * Phase 2 — primary homepage hero.
 * Independent insurance research product (three-question IA).
 */
export function InsuranceHero() {
  return (
    <section
      data-hub="insurance"
      aria-labelledby="insurance-hero-heading"
      className="relative overflow-hidden border-b"
      style={{
        borderColor: INSURANCE_BRAND.border,
        background: `linear-gradient(165deg, ${INSURANCE_BRAND.white} 0%, ${INSURANCE_BRAND.canvas} 48%, ${INSURANCE_BRAND.ice} 100%)`,
      }}
    >
      {/* Soft blue glow — very light */}
      <div
        className="pointer-events-none absolute -right-24 top-0 h-[28rem] w-[28rem] rounded-full opacity-[0.14] blur-3xl"
        style={{ background: INSURANCE_BRAND.shield }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -left-16 bottom-0 h-64 w-64 rounded-full opacity-[0.08] blur-3xl"
        style={{ background: INSURANCE_BRAND.sapphire }}
        aria-hidden
      />

      <div className="ith-section-pad relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
          {/* Copy column */}
          <div className="lg:col-span-6">
            <p
              className="text-[11px] font-semibold uppercase tracking-[0.16em] sm:text-xs"
              style={{ color: INSURANCE_BRAND.shield }}
            >
              {INSURANCE_HERO.eyebrow}
            </p>

            <h1
              id="insurance-hero-heading"
              className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl lg:text-[3.25rem] lg:leading-[1.12]"
              style={{ color: INSURANCE_BRAND.ink }}
            >
              {INSURANCE_HERO.headline}
            </h1>

            <p
              className="mt-5 max-w-xl text-base leading-relaxed sm:text-lg"
              style={{ color: INSURANCE_BRAND.ink }}
            >
              {INSURANCE_HERO.support}
            </p>

            <p
              className="mt-3 text-sm font-medium leading-snug"
              style={{ color: INSURANCE_BRAND.navy }}
            >
              {INSURANCE_HERO.networkLine}
            </p>

            <ConsumerJobPaths className="mt-6" />

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <Link href={INSURANCE_HERO.primaryCta.href} className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="trust"
                  className="h-12 w-full gap-2 px-7 shadow-[0_6px_20px_-6px_rgb(2_132_199_/_0.35)] sm:w-auto"
                >
                  {INSURANCE_HERO.primaryCta.label}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Button>
              </Link>
              <Link href={INSURANCE_HERO.secondaryCta.href} className="w-full sm:w-auto">
                <Button
                  size="lg"
                  variant="outline"
                  className="h-12 w-full gap-2 border-2 border-[#0284C7] px-7 sm:w-auto"
                >
                  <BookOpen className="h-4 w-4 text-[#0284C7]" aria-hidden />
                  {INSURANCE_HERO.secondaryCta.label}
                </Button>
              </Link>
            </div>

            {/* Trust chips */}
            <ul className="mt-8 flex flex-wrap gap-2" aria-label="Trust signals">
              {INSURANCE_HERO.chips.map((chip) => (
                <li
                  key={chip.id}
                  className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold sm:text-sm"
                  style={{
                    borderColor: INSURANCE_BRAND.border,
                    backgroundColor: INSURANCE_BRAND.white,
                    color: INSURANCE_BRAND.ink,
                    boxShadow: INSURANCE_SHADOW.soft,
                  }}
                >
                  <span
                    className="mr-2 h-1.5 w-1.5 shrink-0 rounded-full"
                    style={{ backgroundColor: INSURANCE_BRAND.shield }}
                    aria-hidden
                  />
                  {chip.label}
                </li>
              ))}
            </ul>

            <p
              className="mt-6 text-sm font-semibold tracking-wide"
              style={{ color: INSURANCE_BRAND.navy }}
            >
              {INSURANCE_HERO.philosophy}
              <span className="mx-2 font-normal opacity-40" aria-hidden>
                ·
              </span>
              <span style={{ color: INSURANCE_BRAND.shield }}>{INSURANCE_HERO.tagline}</span>
            </p>
          </div>

          {/* Visual + quick-start column */}
          <div className="relative lg:col-span-6">
            <ProtectVisual className="pointer-events-none absolute -right-4 -top-6 hidden h-40 w-40 opacity-90 sm:block lg:-right-2 lg:top-0 lg:h-48 lg:w-48" />

            <div
              className="relative border bg-white p-5 sm:p-7"
              style={{
                borderColor: INSURANCE_BRAND.border,
                borderRadius: INSURANCE_RADIUS.cardLg,
                boxShadow: INSURANCE_SHADOW.card,
              }}
            >
              <div className="mb-4 flex items-start gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  style={{ backgroundColor: INSURANCE_BRAND.ice, color: INSURANCE_BRAND.shield }}
                  aria-hidden
                >
                  <Shield className="h-5 w-5" />
                </span>
                <div>
                  <h2
                    className="text-base font-bold sm:text-lg"
                    style={{ color: INSURANCE_BRAND.ink }}
                  >
                    {INSURANCE_HERO.searchTitle}
                  </h2>
                  <p className="mt-0.5 text-sm" style={{ color: INSURANCE_BRAND.ink }}>
                    {INSURANCE_HERO.searchHint}
                  </p>
                </div>
              </div>

              <ZipSearch className="max-w-none" />

              <p
                className="mt-4 border-t pt-4 text-xs leading-relaxed sm:text-sm"
                style={{ borderColor: INSURANCE_BRAND.border, color: INSURANCE_BRAND.ink }}
              >
                Research only — not a quote marketplace. We do not sell policies or collect lead
                fees.
              </p>
            </div>

            {/* Soft shield accent bar */}
            <div
              className="absolute -bottom-1 left-6 right-6 h-0.5 rounded-full opacity-80 sm:left-10 sm:right-10"
              style={{
                background: `linear-gradient(90deg, transparent, ${INSURANCE_BRAND.shield}, transparent)`,
              }}
              aria-hidden
            />
          </div>
        </div>
      </div>
    </section>
  );
}

/** Abstract protective geometry — calm shield + nodes, not decorative noise */
function ProtectVisual({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 160 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle
        cx="80"
        cy="80"
        r="72"
        stroke={INSURANCE_BRAND.shield}
        strokeOpacity="0.12"
        strokeWidth="1"
      />
      <circle
        cx="80"
        cy="80"
        r="52"
        stroke={INSURANCE_BRAND.shield}
        strokeOpacity="0.1"
        strokeWidth="1"
      />
      {/* Soft shield outline */}
      <path
        d="M80 32 L118 48 V78 C118 104 100 122 80 130 C60 122 42 104 42 78 V48 Z"
        stroke={INSURANCE_BRAND.shield}
        strokeOpacity="0.35"
        strokeWidth="2.5"
        fill={INSURANCE_BRAND.ice}
        fillOpacity="0.55"
      />
      {/* Hub nodes inside shield */}
      <circle cx="80" cy="78" r="7" fill={INSURANCE_BRAND.navy} fillOpacity="0.85" />
      <circle cx="80" cy="56" r="4" fill={INSURANCE_BRAND.shield} />
      <circle cx="62" cy="90" r="4" fill={INSURANCE_BRAND.sapphire} fillOpacity="0.8" />
      <circle cx="98" cy="90" r="4" fill={INSURANCE_BRAND.shield} fillOpacity="0.75" />
      <line
        x1="80"
        y1="63"
        x2="80"
        y2="71"
        stroke={INSURANCE_BRAND.navy}
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />
      <line
        x1="73"
        y1="82"
        x2="66"
        y2="88"
        stroke={INSURANCE_BRAND.navy}
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />
      <line
        x1="87"
        y1="82"
        x2="94"
        y2="88"
        stroke={INSURANCE_BRAND.navy}
        strokeOpacity="0.35"
        strokeWidth="1.5"
      />
    </svg>
  );
}
