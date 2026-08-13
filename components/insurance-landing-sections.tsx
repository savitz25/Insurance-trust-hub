import Link from 'next/link';
import {
  ArrowRight,
  ArrowUpRight,
  Calculator,
  MapPin,
  Scale,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResearchQuestions } from '@/components/research-questions';
import {
  INSURANCE_BRAND,
  INSURANCE_HOW_IT_WORKS,
  INSURANCE_NETWORK_LINKS,
  INSURANCE_NETWORK_SECTION,
  INSURANCE_PATHWAYS,
  INSURANCE_RADIUS,
  INSURANCE_SHADOW,
  INSURANCE_TOOLS,
  INSURANCE_TRUST,
} from '@/lib/design/insurance-design-system';
import { LOCAL_RESEARCH_ENTRY } from '@/lib/product/research-ia';

const TOOL_ICONS = {
  marketplace: MapPin,
  aca: Calculator,
  cost: Scale,
  complaints: ShieldCheck,
} as const;

/**
 * Phase 2 — homepage sections below the hero (three-question product).
 */
export function InsuranceLandingSections() {
  return (
    <div data-hub="insurance">
      <QuestionsSection />
      <ToolsSection />
      <HowItWorksSection />
      <LocalResearchSection />
      <TrustSection />
      <PathwaysSection />
      <NetworkSection />
    </div>
  );
}

function QuestionsSection() {
  return (
    <SectionShell
      id="research-questions"
      eyebrow="How this product works"
      title="Three questions. One research product."
      support="Every major path on Insurance Trust Hub helps you answer coverage need, local options, and verification — without inventing agencies or selling leads."
      background={INSURANCE_BRAND.white}
    >
      <div className="mt-8 sm:mt-10">
        <ResearchQuestions variant="full" />
      </div>
    </SectionShell>
  );
}

function SectionShell({
  id,
  eyebrow,
  title,
  support,
  children,
  background = INSURANCE_BRAND.white,
  dark = false,
}: {
  id: string;
  eyebrow: string;
  title: string;
  support: string;
  children: React.ReactNode;
  background?: string;
  dark?: boolean;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      className="scroll-mt-24 border-b"
      style={{
        borderColor: dark ? 'rgb(255 255 255 / 0.08)' : INSURANCE_BRAND.border,
        backgroundColor: background,
      }}
    >
      <div className="ith-section-pad">
        <div className="max-w-2xl">
          <p
            className="text-xs font-semibold uppercase tracking-[0.14em]"
            style={{ color: dark ? INSURANCE_BRAND.ice : INSURANCE_BRAND.shield }}
          >
            {eyebrow}
          </p>
          <h2
            id={`${id}-heading`}
            className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl"
            style={{ color: dark ? INSURANCE_BRAND.white : INSURANCE_BRAND.ink }}
          >
            {title}
          </h2>
          <p
            className="mt-3 text-base leading-relaxed sm:mt-4 sm:text-lg"
            style={{ color: dark ? INSURANCE_BRAND.onNavySoft : INSURANCE_BRAND.ink }}
          >
            {support}
          </p>
        </div>
        {children}
      </div>
    </section>
  );
}

function ToolsSection() {
  return (
    <SectionShell
      id="tools"
      eyebrow={INSURANCE_TOOLS.eyebrow}
      title={INSURANCE_TOOLS.title}
      support={INSURANCE_TOOLS.support}
      background={INSURANCE_BRAND.canvas}
    >
      <ul className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2">
        {INSURANCE_TOOLS.items.map((item) => {
          const Icon = TOOL_ICONS[item.id as keyof typeof TOOL_ICONS] ?? Scale;
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className="group flex h-full min-h-[11rem] flex-col rounded-2xl border bg-white p-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7] focus-visible:ring-offset-2 sm:p-6"
                style={{
                  borderColor: INSURANCE_BRAND.border,
                  borderRadius: INSURANCE_RADIUS.cardLg,
                  boxShadow: INSURANCE_SHADOW.card,
                }}
              >
                <span
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: INSURANCE_BRAND.ice, color: INSURANCE_BRAND.shield }}
                  aria-hidden
                >
                  <Icon className="h-5 w-5" />
                </span>
                <h3
                  className="mt-4 text-lg font-semibold tracking-tight"
                  style={{ color: INSURANCE_BRAND.ink }}
                >
                  {item.title}
                </h3>
                <p
                  className="mt-2 flex-1 text-sm leading-relaxed"
                  style={{ color: INSURANCE_BRAND.ink }}
                >
                  {item.description}
                </p>
                <span
                  className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold"
                  style={{ color: INSURANCE_BRAND.shield }}
                >
                  {item.cta}
                  <ArrowRight
                    className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden
                  />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </SectionShell>
  );
}

function HowItWorksSection() {
  return (
    <SectionShell
      id="how-it-works"
      eyebrow={INSURANCE_HOW_IT_WORKS.eyebrow}
      title={INSURANCE_HOW_IT_WORKS.title}
      support={INSURANCE_HOW_IT_WORKS.support}
      background={INSURANCE_BRAND.white}
    >
      <ol className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2 lg:grid-cols-4">
        {INSURANCE_HOW_IT_WORKS.steps.map((item) => (
          <li
            key={item.step}
            className="flex h-full flex-col rounded-2xl border bg-white p-5 sm:p-6"
            style={{
              borderColor: INSURANCE_BRAND.border,
              borderRadius: INSURANCE_RADIUS.cardLg,
              boxShadow: INSURANCE_SHADOW.card,
            }}
          >
            <span
              className="text-2xl font-bold tabular-nums"
              style={{ color: INSURANCE_BRAND.shield, opacity: 0.45 }}
              aria-hidden
            >
              {item.step}
            </span>
            <h3
              className="mt-3 text-base font-semibold tracking-tight"
              style={{ color: INSURANCE_BRAND.ink }}
            >
              {item.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: INSURANCE_BRAND.ink }}>
              {item.description}
            </p>
          </li>
        ))}
      </ol>
    </SectionShell>
  );
}

function TrustSection() {
  return (
    <SectionShell
      id="trust"
      eyebrow={INSURANCE_TRUST.eyebrow}
      title={INSURANCE_TRUST.title}
      support={INSURANCE_TRUST.support}
      background={INSURANCE_BRAND.navy}
      dark
    >
      <ul className="mt-8 grid gap-4 sm:mt-10 sm:grid-cols-2">
        {INSURANCE_TRUST.pillars.map((pillar) => (
          <li
            key={pillar.title}
            className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6"
          >
            <ShieldCheck
              className="mt-0.5 h-5 w-5 shrink-0"
              style={{ color: INSURANCE_BRAND.shield }}
              aria-hidden
            />
            <div>
              <h3 className="text-base font-semibold text-white">{pillar.title}</h3>
              <p
                className="mt-1.5 text-sm leading-relaxed"
                style={{ color: INSURANCE_BRAND.onNavySoft }}
              >
                {pillar.body}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-8 flex flex-col gap-3 sm:mt-10 sm:flex-row sm:flex-wrap sm:items-center">
        <Link href={INSURANCE_TRUST.primaryCta.href} className="w-full sm:w-auto">
          <Button size="lg" variant="trust" className="min-h-12 w-full gap-2 sm:w-auto">
            {INSURANCE_TRUST.primaryCta.label}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Button>
        </Link>
        <a
          href={INSURANCE_TRUST.secondaryCta.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/25 px-6 text-sm font-semibold text-white transition-colors hover:bg-white/10 sm:w-auto"
        >
          {INSURANCE_TRUST.secondaryCta.label}
          <ArrowUpRight className="h-4 w-4" aria-hidden />
        </a>
        <Link
          href={INSURANCE_TRUST.tertiaryCta.href}
          className="inline-flex h-12 items-center justify-center px-2 text-sm font-semibold text-white/90 underline-offset-4 hover:text-white hover:underline"
        >
          {INSURANCE_TRUST.tertiaryCta.label}
        </Link>
      </div>

      <p className="mt-8 text-sm font-semibold tracking-wide text-white">
        {INSURANCE_TRUST.philosophy}
        <span className="mx-2 font-normal text-white/40" aria-hidden>
          ·
        </span>
        <span style={{ color: INSURANCE_BRAND.ice }}>{INSURANCE_TRUST.tagline}</span>
      </p>
    </SectionShell>
  );
}

function LocalResearchSection() {
  return (
    <SectionShell
      id="local-research"
      eyebrow="Where you live"
      title={LOCAL_RESEARCH_ENTRY.title}
      support={LOCAL_RESEARCH_ENTRY.support}
      background={INSURANCE_BRAND.canvas}
    >
      <ul className="mt-8 flex flex-wrap gap-2 sm:mt-10">
        {LOCAL_RESEARCH_ENTRY.links.map((link) => (
          <li key={link.href}>
            <Link
              href={link.href}
              className="inline-flex min-h-11 items-center rounded-full border bg-white px-4 py-2 text-sm font-semibold transition-colors hover:border-[#0284C7]/40 hover:bg-[#E0F2FE]/50"
              style={{ borderColor: INSURANCE_BRAND.border, color: INSURANCE_BRAND.ink }}
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-sm" style={{ color: INSURANCE_BRAND.ink }}>
        Soft path only:{' '}
        <Link
          href="/directory?verified=true"
          className="font-semibold underline-offset-2 hover:underline"
          style={{ color: INSURANCE_BRAND.shield }}
        >
          verified agency directory
        </Link>
        {' '}
        (Florida DFS, Texas TDI, Ohio ODI research listings).
      </p>
    </SectionShell>
  );
}

function PathwaysSection() {
  return (
    <SectionShell
      id="pathways"
      eyebrow={INSURANCE_PATHWAYS.eyebrow}
      title={INSURANCE_PATHWAYS.title}
      support={INSURANCE_PATHWAYS.support}
      background={INSURANCE_BRAND.white}
    >
      <div className="mt-8 grid gap-4 sm:mt-10 sm:gap-5 lg:grid-cols-2 xl:grid-cols-4">
        {/* Coverage types */}
        <PathwayCard
          icon={<Shield className="h-4 w-4" style={{ color: INSURANCE_BRAND.shield }} />}
          title="Coverage types"
        >
          <ul className="mt-4 flex flex-wrap gap-2">
            {INSURANCE_PATHWAYS.coverageTypes.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 items-center rounded-full border bg-white px-3.5 py-2 text-sm font-semibold transition-colors hover:border-[#0284C7]/40 hover:bg-[#E0F2FE]/50"
                  style={{ borderColor: INSURANCE_BRAND.border, color: INSURANCE_BRAND.ink }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </PathwayCard>

        {/* Markets */}
        <PathwayCard
          icon={<MapPin className="h-4 w-4" style={{ color: INSURANCE_BRAND.shield }} />}
          title="Markets"
        >
          <ul className="mt-4 flex flex-wrap gap-2">
            {INSURANCE_PATHWAYS.markets.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="inline-flex min-h-11 items-center rounded-full border bg-white px-3.5 py-2 text-sm font-semibold transition-colors hover:border-[#0284C7]/40 hover:bg-[#E0F2FE]/50"
                  style={{ borderColor: INSURANCE_BRAND.border, color: INSURANCE_BRAND.ink }}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </PathwayCard>

        {/* Goals */}
        <PathwayCard
          icon={<Scale className="h-4 w-4" style={{ color: INSURANCE_BRAND.shield }} />}
          title="Protection goals"
        >
          <ul className="mt-4 space-y-2">
            {INSURANCE_PATHWAYS.goals.map((goal) => (
              <li key={goal.label}>
                <Link
                  href={goal.href}
                  title={goal.detail}
                  className="flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3.5 py-3 text-sm font-semibold transition-colors hover:border-[#0284C7]/40 hover:bg-[#E0F2FE]/40"
                  style={{ borderColor: INSURANCE_BRAND.border, color: INSURANCE_BRAND.ink }}
                >
                  {goal.label}
                  <ArrowRight
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: INSURANCE_BRAND.shield }}
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </PathwayCard>

        {/* Quick tools */}
        <PathwayCard
          icon={<Calculator className="h-4 w-4" style={{ color: INSURANCE_BRAND.shield }} />}
          title="Quick links"
        >
          <ul className="mt-4 space-y-2">
            {INSURANCE_PATHWAYS.tools.map((tool) => (
              <li key={tool.href}>
                <Link
                  href={tool.href}
                  className="flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3.5 py-3 text-sm font-semibold transition-colors hover:border-[#0284C7]/40 hover:bg-[#E0F2FE]/40"
                  style={{ borderColor: INSURANCE_BRAND.border, color: INSURANCE_BRAND.ink }}
                >
                  {tool.label}
                  <ArrowRight
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: INSURANCE_BRAND.shield }}
                    aria-hidden
                  />
                </Link>
              </li>
            ))}
          </ul>
        </PathwayCard>
      </div>
    </SectionShell>
  );
}

function PathwayCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl border bg-white p-5 sm:p-6"
      style={{
        borderColor: INSURANCE_BRAND.border,
        borderRadius: INSURANCE_RADIUS.cardLg,
        boxShadow: INSURANCE_SHADOW.card,
      }}
    >
      <div className="flex items-center gap-2">
        {icon}
        <h3
          className="text-sm font-semibold uppercase tracking-wide"
          style={{ color: INSURANCE_BRAND.navy }}
        >
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function NetworkSection() {
  return (
    <SectionShell
      id="network"
      eyebrow={INSURANCE_NETWORK_SECTION.eyebrow}
      title={INSURANCE_NETWORK_SECTION.title}
      support={INSURANCE_NETWORK_SECTION.support}
      background={INSURANCE_BRAND.white}
    >
      <ul className="mt-8 grid gap-4 sm:mt-10 md:grid-cols-3">
        {INSURANCE_NETWORK_LINKS.map((hub) => (
          <li key={hub.id}>
            <a
              href={hub.href}
              rel="noopener noreferrer"
              className="flex h-full flex-col rounded-2xl border bg-white p-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7] focus-visible:ring-offset-2 hover:border-[#0284C7]/35 sm:p-6"
              style={{
                borderColor: INSURANCE_BRAND.border,
                borderRadius: INSURANCE_RADIUS.cardLg,
                boxShadow: INSURANCE_SHADOW.card,
              }}
            >
              <p
                className="text-xs font-semibold uppercase tracking-[0.12em]"
                style={{ color: INSURANCE_BRAND.shield }}
              >
                {hub.shortLabel}
              </p>
              <h3
                className="mt-1 text-lg font-semibold tracking-tight"
                style={{ color: INSURANCE_BRAND.ink }}
              >
                {hub.label}
              </h3>
              <p
                className="mt-3 flex-1 text-sm leading-relaxed"
                style={{ color: INSURANCE_BRAND.ink }}
              >
                {hub.blurb}
              </p>
              <span
                className="mt-5 inline-flex items-center gap-1 text-sm font-semibold"
                style={{ color: INSURANCE_BRAND.shield }}
              >
                Visit hub
                <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </span>
            </a>
          </li>
        ))}
      </ul>

      <p className="mt-10 text-sm font-semibold" style={{ color: INSURANCE_BRAND.navy }}>
        {INSURANCE_NETWORK_SECTION.philosophy}
        <span className="mx-2 font-normal opacity-40" aria-hidden>
          ·
        </span>
        <span style={{ color: INSURANCE_BRAND.shield }}>{INSURANCE_NETWORK_SECTION.tagline}</span>
      </p>
    </SectionShell>
  );
}
