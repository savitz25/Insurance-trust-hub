import type { Metadata } from 'next';
import Link from 'next/link';
import {
  BadgeCheck,
  Database,
  RefreshCw,
  Scale,
  Shield,
  AlertTriangle,
  Calculator,
} from 'lucide-react';
import { buildMetadata } from '@/lib/seo/metadata';
import { DISCLAIMER, SITE_NAME } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/card';
import { ASK_TRUST_HUB } from '@/lib/network/ask-trust-hub';
import { TrustMark } from '@/components/network/trust-mark';

export const metadata: Metadata = buildMetadata({
  title: 'Methodology — verification & Coverage Intelligence sources',
  description:
    'How Insurance Trust Hub verifies agencies and builds Coverage Intelligence (ACA, Medicare, carriers) under The Ask Trust Hub Standard. CMS vintages, quality-gated pages, independence. Research only — not quotes or enrollment.',
  path: '/methodology',
});

const PIPELINE = [
  {
    verb: 'SOURCE',
    title: 'Authoritative insurance sources',
    body: 'We prioritize state Department of Insurance (DOI) public license records and NAIC producer pathways where used. Educational premium ranges are labeled as estimates — never as binding quotes or regulatory status.',
  },
  {
    verb: 'VERIFY',
    title: 'What “verified” means for agents & agencies',
    body: 'Where available, we match agent/agency names and license numbers to public DOI records and surface Active status and lines of authority when disclosed. We do not invent Active status, carrier appointments, or authority we did not check.',
  },
  {
    verb: 'DISCLOSE',
    title: 'Limits and independence',
    body: 'We are not an insurance agency or carrier. We do not sell policies, issue free quotes as a brokerage, or accept paid placements. Calculators and guides are educational. Always re-check licenses on the official state DOI site before purchasing coverage.',
  },
  {
    verb: 'SCORE',
    title: 'No decorative universal rankings',
    body: 'Directory ordering is not sold. Research signals are aids — not underwriting decisions or carrier recommendations.',
  },
  {
    verb: 'UPDATE',
    title: 'Cadence and corrections',
    body: 'License data and profiles can change. Corrections reported by agencies or consumers are reviewed through our contact process. Public records may still lag reality.',
  },
  {
    verb: 'YOU DECIDE',
    title: 'Confirm with regulators and licensed professionals',
    body: 'Use this hub to research. Confirm producer licenses and policy terms with the state DOI / NAIC pathways and the licensed professional before you bind coverage.',
  },
] as const;

const DATA_SOURCES = [
  {
    name: 'State DOI public license databases',
    detail:
      'Primary source for producer and agency license status, lines of authority, and jurisdiction when publicly available.',
  },
  {
    name: 'NAIC / NPN pathways',
    detail:
      'Coordinating references for multi-state producer identity where used — always secondary to the state’s own record.',
  },
  {
    name: 'CMS Marketplace API (ACA Coverage Intelligence)',
    detail:
      'Plan search, provider network, formulary, and OOPC fields when configured. Flagship local landscape research (/tools/marketplace-plan-research), Plan Explorer, Plan X-Ray, county ACA snapshots, and carrier ACA rollups. Fail closed when data is missing — no invented premiums or matches. Not an eligibility determination or enrollment site.',
  },
  {
    name: 'CMS Medicare extracts (Medicare Intelligence)',
    detail:
      'CPSC enrollment by county/contract and Star Ratings complaint measures (C28/D02) for Plan Complaint Index, county Medicare dashboards, contract pages, and carrier Medicare rollups. Vintages labeled on each surface.',
  },
  {
    name: 'Public complaint / regulatory actions',
    detail:
      'Only when we actually incorporate an attributable public source (e.g. CMS complaint index for Medicare research).',
  },
  {
    name: 'Educational reference ranges',
    detail:
      'Premium, subsidy, and needs tools use public program rules and labeled assumptions. Outputs are not quotes, eligibility determinations, or enrollment.',
  },
] as const;

const LIMITATIONS = [
  'State portals differ in completeness, update frequency, and public field availability.',
  'A listing is not a recommendation, endorsement, or guarantee of claims service.',
  'We do not underwrite, sell policies, bind coverage, or place carrier appointments for you.',
  'Medicare, ACA, and other tools are educational — program rules change and personal eligibility varies.',
  'Modeled cost estimates must never be treated as carrier-bound rates.',
  'Coverage Intelligence pages (county, contract, carrier) are not complete national inventories and are not official CMS tools.',
  'We do not operate a “free insurance quotes” lead marketplace; research and verification only.',
  'Seed or incomplete agency listings are never treated as verified indexable research inventory.',
] as const;

export default function MethodologyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-10 md:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Vertical methodology · Insurance
      </p>
      <h1 className="section-heading mt-3">Insurance Trust Hub methodology</h1>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
        How {SITE_NAME} applies The Ask Trust Hub Standard to state-licensed insurance research —
        sources, verification, tools vs directory, cadence, and limits. Part of the Ask Trust Hub
        network — common ownership, separated research and listing order, no paid placements.
      </p>
      <div className="mt-4">
        <TrustMark />
      </div>

      <aside className="mt-8 rounded-xl border border-[#0284C7]/20 bg-[#E0F2FE]/30 px-4 py-4 text-sm sm:px-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#0284C7]">
          Coverage Intelligence research
        </p>
        <p className="mt-1.5 leading-relaxed text-muted-foreground">
          Plan Explorer, Marketplace county pages, Medicare hub, contracts, and carrier profiles use
          CMS-backed extracts and labeled educational estimates only. Quality-gated indexation — no
          mass thin counties or seed-agency SEO.
        </p>
        <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
          <Link
            href="/tools/marketplace-plan-research"
            className="font-medium text-primary hover:underline"
          >
            Local plan landscape
          </Link>
          <Link href="/tools/aca-plan-explorer" className="font-medium text-primary hover:underline">
            ACA Plan Explorer
          </Link>
          <Link href="/marketplace" className="font-medium text-primary hover:underline">
            Marketplace
          </Link>
          <Link href="/medicare" className="font-medium text-primary hover:underline">
            Medicare
          </Link>
          <Link href="/carriers" className="font-medium text-primary hover:underline">
            Carriers
          </Link>
          <Link href="/tools" className="font-medium text-primary hover:underline">
            Research Center
          </Link>
        </p>
      </aside>

      <aside className="mt-6 rounded-xl border bg-muted/25 px-4 py-4 text-sm sm:px-5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Parent standard
        </p>
        <p className="mt-1.5 leading-relaxed text-muted-foreground">
          This hub inherits{' '}
          <strong className="text-foreground">The Ask Trust Hub Standard</strong>
          {' — '}
          SOURCE → VERIFY → DISCLOSE → SCORE → UPDATE → YOU DECIDE. Framework is shared; data and
          checks below are insurance-specific.
        </p>
        <p className="mt-2">
          <a
            href={ASK_TRUST_HUB.methodologyUrl}
            className="font-semibold text-primary underline-offset-2 hover:underline"
            rel="noopener noreferrer"
          >
            Read the Ask Trust Hub Standard
          </a>
          {' · '}
          <a
            href={ASK_TRUST_HUB.promiseUrl}
            className="font-medium underline-offset-2 hover:underline"
            rel="noopener noreferrer"
          >
            Independence
          </a>
          {' · '}
          <a
            href={ASK_TRUST_HUB.revenueUrl}
            className="font-medium underline-offset-2 hover:underline"
            rel="noopener noreferrer"
          >
            How we make money
          </a>
        </p>
      </aside>

      <section className="mt-12">
        <h2 className="flex items-center gap-2 text-2xl font-semibold">
          <Scale className="h-5 w-5 text-primary" aria-hidden />
          Pipeline on this hub
        </h2>
        <ol className="mt-6 space-y-4">
          {PIPELINE.map((step, i) => (
            <li key={step.verb}>
              <Card>
                <CardContent className="flex gap-4 pt-5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                      {step.verb}
                    </p>
                    <h3 className="mt-0.5 font-semibold">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-12">
        <h2 className="flex items-center gap-2 text-2xl font-semibold">
          <BadgeCheck className="h-5 w-5 text-trust" aria-hidden />
          What “verified” means here
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed text-muted-foreground">
          <li>State DOI license number and Active / inactive status when the portal exposes it</li>
          <li>Legal or DBA name matching against public records where possible</li>
          <li>Lines of authority / license types when disclosed</li>
          <li>NPN / NAIC references as secondary identity anchors</li>
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="flex items-center gap-2 text-2xl font-semibold">
          <Calculator className="h-5 w-5 text-primary" aria-hidden />
          Tools vs directory
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Card>
            <CardContent className="pt-5 text-sm leading-relaxed text-muted-foreground">
              <h3 className="font-semibold text-foreground">Directory</h3>
              <p className="mt-2">
                Research licensed agents and agencies. Ordering is not sold. Identity and license
                context come from public sources where available.
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 text-sm leading-relaxed text-muted-foreground">
              <h3 className="font-semibold text-foreground">Calculators &amp; guides</h3>
              <p className="mt-2">
                Educational estimates and explainers (ACA, Medicare, cost tools). Not plan enrollment,
                not binding quotes, and not underwriting decisions.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="flex items-center gap-2 text-2xl font-semibold">
          <Database className="h-5 w-5 text-primary" aria-hidden />
          Data sources
        </h2>
        <ul className="mt-6 space-y-4">
          {DATA_SOURCES.map((src) => (
            <li key={src.name} className="rounded-lg border bg-card px-4 py-3">
              <h3 className="font-semibold text-foreground">{src.name}</h3>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{src.detail}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12">
        <h2 className="flex items-center gap-2 text-2xl font-semibold">
          <RefreshCw className="h-5 w-5 text-primary" aria-hidden />
          Update cadence
        </h2>
        <p className="mt-4 leading-relaxed text-muted-foreground">
          Profile and directory data refresh as source systems and editorial workflows allow. Always
          re-verify on the official DOI portal before purchasing a policy.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="flex items-center gap-2 text-2xl font-semibold">
          <AlertTriangle className="h-5 w-5 text-amber-600" aria-hidden />
          Limitations
        </h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 leading-relaxed text-muted-foreground">
          {LIMITATIONS.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <section id="disclaimer" className="mt-12 rounded-xl border bg-muted/30 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Shield className="h-5 w-5" aria-hidden />
          Verify with the primary regulator
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{DISCLAIMER}</p>
      </section>

      <div className="mt-10 flex flex-wrap gap-3 text-sm">
        <a
          href={ASK_TRUST_HUB.methodologyUrl}
          className="font-semibold text-primary underline-offset-2 hover:underline"
          rel="noopener noreferrer"
        >
          Ask Trust Hub Standard
        </a>
        <Link href="/about" className="font-medium text-muted-foreground underline-offset-2 hover:underline">
          About
        </Link>
        <Link
          href="/directory"
          className="font-medium text-muted-foreground underline-offset-2 hover:underline"
        >
          Agency directory
        </Link>
        <Link
          href="/contact"
          className="font-medium text-muted-foreground underline-offset-2 hover:underline"
        >
          Report a correction
        </Link>
      </div>
    </div>
  );
}
