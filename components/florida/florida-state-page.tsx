import type { ReactNode } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import { ContextNav } from '@/components/context-nav';
import { TrustMark } from '@/components/network/trust-mark';
import { FloridaBars } from '@/components/florida/florida-bars';
import type { FloridaStateView } from '@/lib/national/fl-state-display';
import { CMS_SAFE_COPY, SURPLUS_SAFE_COPY } from '@/lib/national/fl-state-intel';
import { FL_MARKET_SOURCES } from '@/lib/national/fl-market-intelligence';

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 space-y-3">
      {eyebrow ? (
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0284C7]">{eyebrow}</p>
      ) : null}
      <h2 className="text-2xl font-semibold tracking-tight text-[#0A2540]">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-[#1E293B]">{children}</div>
    </section>
  );
}

function Official({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="inline-flex items-center gap-1 font-medium text-[#0284C7] underline-offset-2 hover:underline"
      rel="noopener noreferrer"
      target="_blank"
    >
      {label}
      <ExternalLink className="h-3.5 w-3.5" aria-hidden />
    </a>
  );
}

export function FloridaStatePage({ view }: { view: FloridaStateView }) {
  const toc = [
    ['overview', 'Overview'],
    ['agency-credentials', 'Agency credentials'],
    ['producer-credentials', 'Individual credentials'],
    ['appointments', 'Appointments'],
    ['oir', 'OIR company universe'],
    ['market', 'Residential market'],
    ['pif', 'Policies in force'],
    ['premium', 'Written premium'],
    ['exposure', 'Exposure'],
    ['surplus', 'Surplus lines'],
    ['cms', 'CMS Marketplace'],
    ['citizens', 'Citizens'],
    ['choices', 'CHOICES'],
    ['irfs', 'IRFS'],
    ['nfip', 'Flood / NFIP'],
    ['regulatory', 'Regulatory history'],
    ['methodology', 'Methodology'],
    ['clocks', 'Source clocks'],
    ['limitations', 'Limitations'],
  ] as const;

  return (
    <>
      <div className="border-b bg-gradient-to-br from-[#E0F2FE]/70 via-background to-background">
        <div className="container mx-auto max-w-5xl px-4 py-10 md:py-14">
          <ContextNav pathname="/florida" currentLabel="Florida insurance research" className="mb-5" />
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0284C7]">
            Florida Insurance Intelligence
          </p>
          <h1 className="mt-2 max-w-4xl text-3xl font-bold tracking-tight text-[#0A2540] md:text-5xl">
            {view.title}
          </h1>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-[#1E293B]">
            Florida insurance research spans DFS licenses, appointments, OIR company identity,
            NAIC legal insurers, Marketplace registration evidence, statewide residential market
            activity, surplus-lines eligibility, regulatory records, and official consumer
            research tools. Not every layer applies to every provider.
          </p>
          <p className="mt-3 max-w-3xl text-sm text-muted-foreground">
            Independent research. Not rankings, Trust Scores, quotes, or recommendations. Snapshot{' '}
            <span className="font-medium text-foreground">{view.version}</span>
            {' · '}
            as of {view.asOf}.
          </p>
          <div className="mt-4">
            <TrustMark />
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-10 md:py-14 space-y-14">
        <nav aria-label="On this page" className="rounded-xl border bg-white p-4 md:p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            On this page
          </p>
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {toc.map(([id, label]) => (
              <li key={id}>
                <a href={`#${id}`} className="text-[#0284C7] hover:underline">
                  {label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {view.cards.map((card) => (
            <Card key={card.id} className="h-full">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.label}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold tabular-nums tracking-tight text-[#0A2540]">
                  {card.value}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{card.grain}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          These grains overlap. Do not add them together.
        </p>

        <Section id="overview" eyebrow="A" title="Florida Insurance Overview">
          <p>
            This page reports Florida-specific identity, licensing, market, and regulatory layers
            from official sources currently included in InsuranceTrustHub research. Public provider
            profiles stay limited to already-approved listings. Graph agencies, people, and legal
            insurers are not mass-published from these counts.
          </p>
        </Section>

        <Section id="agency-credentials" eyebrow="B" title="Florida Agency Credentials">
          <p>
            {view.agency.rows} Florida agency credential rows cover {view.agency.distinct} distinct
            agencies. A credential row is a license record, not a line of authority and not an
            appointment.
          </p>
          <p>
            All currently stored graph agency credential status values are unknown (
            {view.agency.unknownStatus} rows). Unknown is not displayed as active, and it is not
            inferred inactive. We do not report “active agencies = {view.agency.distinct}.”
          </p>
          <p>
            {view.agency.withAppointment} of those credentialed agencies also have at least one
            Florida <span className="font-medium">appointed_by</span> observation.{' '}
            {view.agency.withoutAppointment} have a Florida credential without that appointment
            evidence in currently included sources. Missing appointment rows are not zero
            appointments.
          </p>
          <p className="text-sm text-muted-foreground">
            Namespaces preserve official class. These are not all “insurance agencies” in the same
            regulatory sense.
          </p>
          <FloridaBars rows={view.agency.namespaces} caption="Florida agency credential namespaces" />
          <h3 className="pt-4 text-base font-semibold text-[#0A2540]">Leading license classes</h3>
          <FloridaBars rows={view.agency.classes} caption="Florida agency license classes" />
        </Section>

        <Section id="producer-credentials" eyebrow="C" title="Florida Individual / Producer Credentials">
          <p>
            {view.person.distinct} distinct persons have at least one Florida credential (
            {view.person.rows} rows across {view.person.classCount} license classes). This is a
            credential universe. It is not a public people directory, and not every person is an
            “insurance agent.”
          </p>
          <p>
            Individual names and profile links are not published. Public people remain 0.
          </p>
          <FloridaBars rows={view.person.classes} caption="Florida individual license classes" />
        </Section>

        <Section id="appointments" eyebrow="D" title="Florida Appointment Evidence">
          <p>
            Agency appointment observations: {view.appointment.observations} across{' '}
            {view.appointment.agencies} distinct agencies and {view.appointment.appointers} distinct
            DFS appointing-entity identifiers. Source status: {view.appointment.current} current,{' '}
            {view.appointment.historical} historical.
          </p>
          <p>
            Person APPOINTED_TO observations: {view.appointment.personAppointedTo} covering{' '}
            {view.appointment.distinctPersons} distinct persons (locked INS-NAT-013 census). Those
            people are not individually public.
          </p>
          <p>
            Appointment evidence is not employment, not quality, and not county authorization.
          </p>
          <FloridaBars rows={view.appointment.statusBars} caption="Agency appointment status" />
          <aside className="mt-4 rounded-xl border border-amber-200/80 bg-amber-50/60 px-4 py-3 text-sm leading-relaxed">
            <p className="font-semibold text-[#0A2540]">Appointer identity limitation</p>
            <p className="mt-1">{view.appointment.limitation}</p>
            <p className="mt-2 text-muted-foreground">
              DFS appointers: {view.appointment.dfsAppointers}. Florida APPOINTER_RESOLVES_TO:{' '}
              {view.appointment.resolvesTo}. Digit coincidences remain REVIEW_REQUIRED:{' '}
              {view.appointment.coincidences}. We do not render “Appointed by [legal insurer]”
              without an exact bridge.
            </p>
          </aside>
        </Section>

        <Section id="oir" eyebrow="E" title="Florida OIR Company Universe">
          <p>
            National legal insurers (NAIC spine): {view.oir.legalInsurers}. OIR active companies:{' '}
            {view.oir.active} ({view.oir.withNaic} with NAIC, {view.oir.withoutNaic} without). Exact
            national–OIR match rows: {view.oir.matchRows} covering {view.oir.distinctNaic} distinct
            NAIC codes. Safe Florida Company Code identifiers: {view.oir.safeCodes}.
          </p>
          <p>
            These are overlapping identity cohorts. Do not add them. Florida Company Code is stored
            only when the same official OIR record also has NAIC.
          </p>
          <FloridaBars rows={view.oir.coverageBars} caption="OIR identity coverage" />
        </Section>

        <Section id="market" eyebrow="F" title="Residential Market Activity">
          <p>
            Source: Florida OIR Market Information Reports (MIR), statewide residential extract.
            Period {view.mir.period}. As of {view.mir.asOf}. {view.mir.insurers} NAIC insurers
            appear in that extract ({view.mir.observations} observations). Trade-secret companies
            are omitted. OIR does not audit the data before publication.
          </p>
          <p>
            Reporting volume is not a recommendation. Source rank in the MIR file is not a
            TrustHub rank. We do not publish “largest,” “best,” or “top” tables from these
            observations.
          </p>
          <p>
            <Official href={FL_MARKET_SOURCES.mirReports.portal} label="OIR residential market reports" />
          </p>
        </Section>

        <Section id="pif" eyebrow="G" title="Policies in Force">
          <p>
            Personal residential PIF: {view.mir.pifPersonal}. Commercial residential PIF:{' '}
            {view.mir.pifCommercial}. Valid residential PIF total: {view.mir.pifTotal} (personal +
            commercial). PIF is not quality.
          </p>
          <p className="text-sm text-muted-foreground">
            A stored MIR rank column exists in the warehouse and is not a policy count. It is not
            shown here.
          </p>
          <FloridaBars rows={view.mir.pifBars} caption="Residential PIF composition" />
        </Section>

        <Section id="premium" eyebrow="H" title="Written Premium">
          <p>
            Written premium total: ${view.mir.premiumTotal}. Personal residential: $
            {view.mir.premiumPersonal}. Commercial residential: ${view.mir.premiumCommercial}.
            Written premium is not a consumer price or a quote.
          </p>
          <FloridaBars rows={view.mir.premiumBars} caption="Written premium composition" />
        </Section>

        <Section id="exposure" eyebrow="I" title="Exposure">
          <p>
            Exposure in force total: ${view.mir.exposure}. Exposure is a source-reported dollar
            measure for policies in force. It is not quality, safety, or a consumer price.
          </p>
        </Section>

        <Section id="surplus" eyebrow="J" title="Surplus Lines">
          <p>
            {view.surplus.eligible} eligibility observations. {view.surplus.attached} attached by
            exact NAIC. {view.surplus.unresolved} unresolved and unattached. Safe wording:{' '}
            <span className="font-medium">{SURPLUS_SAFE_COPY}</span>. Eligibility is not admitted
            status, and it is not a standard-market license.
          </p>
          <FloridaBars rows={view.surplus.bars} caption="Surplus-lines identity coverage" />
        </Section>

        <Section id="cms" eyebrow="K" title="CMS Marketplace Context">
          <p>
            CMS Marketplace registration is federal evidence, not a Florida insurance license.
            National observations currently included: {view.cms.national} (attached {view.cms.attached}
            , unattached {view.cms.unattached}, kind conflict {view.cms.conflict}). That national
            total is not a Florida-specific CMS denominator, so it is not used as a Florida headline
            card.
          </p>
          <p>
            CMS evidence attaches to person NPN. Public people remain 0, so public-profile CMS
            readiness is {view.cms.publicAgencyReady}. We do not force CMS onto agency profiles.{' '}
            {CMS_SAFE_COPY} is the profile wording when person evidence is later eligible.
          </p>
        </Section>

        <Section id="citizens" eyebrow="L" title="Citizens Residual Market">
          <p>
            {view.citizens.label}. A current official dated policy-in-force source has not been
            captured ({view.citizens.state}). No policy count is displayed. Older or secondary
            counts are not reused. Citizens is not called Florida’s largest insurer.
          </p>
          <p>
            <Official href={FL_MARKET_SOURCES.citizens.portal} label="Citizens Property Insurance Corporation" />
          </p>
        </Section>

        <Section id="choices" eyebrow="M" title="CHOICES Sample Rate Research">
          <p>
            Florida OIR CHOICES is an interactive sample-rate comparison tool for defined profiles
            and locations. Supported products identified: homeowners, private passenger auto,
            Medigap, and small-group health.
          </p>
          <p className="font-medium">{view.choices.copy}</p>
          <p>Sample values are not quotes. Statewide averages are not displayed.</p>
          <p>
            <Official href={FL_MARKET_SOURCES.choices.hub} label="OIR CHOICES" />
          </p>
        </Section>

        <Section id="irfs" eyebrow="N" title="IRFS Filing Research">
          <p>
            OIR Insurance Regulation Filing System public search is available from {view.irfs.from},
            with about {view.irfs.cap} results per search. Filings are not exhaustively ingested
            statewide, so no statewide filing count is shown.
          </p>
          <p>A filing is not quality, and a filing is not necessarily a rate increase.</p>
          <p>
            <Official href={FL_MARKET_SOURCES.irfs.publicSearch} label="IRFS public search" />
          </p>
        </Section>

        <Section id="nfip" eyebrow="O" title="Flood / NFIP Registry">
          <p>
            Public FEMA/NFIP agency registry cards currently listed: {view.nfip.cards}. NPN is
            present on 0 of those public cards, so exact agency attaches are {view.nfip.attaches}.
            Safe wording: {view.nfip.copy}. A registry listing is not NFIP certification or flood
            certification. No profile attaches by name.
          </p>
        </Section>

        <Section id="regulatory" eyebrow="P" title={view.regulatory.heading}>
          <p>
            Stored Florida evidence: {view.regulatory.stored} {view.regulatory.family} rows,
            attached {view.regulatory.attached}, INTERNAL_ONLY. Catalog census still unattached
            because listing metadata lacks NAIC / Florida Company Code: market-conduct reports{' '}
            {view.regulatory.marketConduct}, financial exams {view.regulatory.financialExam}, orders{' '}
            {view.regulatory.orders}.
          </p>
          <p>
            Liquidation is not misconduct. Exam existence is not misconduct. A civil remedy notice
            is not a finding. Missing attached evidence is not a clean regulatory record, and we
            do not display 0 complaints, 0 actions, or “no violations” on profiles.
          </p>
        </Section>

        <Section id="methodology" eyebrow="Q" title="Methodology">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              A public <span className="font-medium">provider</span> is a directory listing. A{' '}
              <span className="font-medium">graph agency</span> is a national entity. They overlap
              only through a CONFIRMED exact-NPN bridge.
            </li>
            <li>DFS credentials are license rows. License class (TYCL) is not a line of authority.</li>
            <li>DFS appointments use appointing-entity numbers, not NAIC company codes.</li>
            <li>{view.appointment.limitation}</li>
            <li>OIR company identity and NAIC legal-insurer identity are additive, overlapping grains.</li>
            <li>MIR reports statewide residential activity as filed. Unaudited. Trade secret omitted.</li>
            <li>FSLSO eligibility is not admitted status.</li>
            <li>CMS Marketplace registration is not a Florida license.</li>
            <li>CHOICES values are sample premiums, not quotes.</li>
            <li>IRFS is a public search, not an exhaustive filing universe.</li>
            <li>Citizens PIF fails closed without a current official dated source.</li>
            <li>NFIP public cards are registry listings, not certification, and have no NPN.</li>
            <li>Florida regulatory catalogs are not firm history without exact identity.</li>
            <li>Each source keeps its own clock. Clocks are not combined into an undated headline.</li>
          </ul>
          <p>
            <Link href="/methodology" className="font-medium text-[#0284C7] hover:underline">
              Hub-wide methodology
            </Link>
          </p>
        </Section>

        <Section id="clocks" eyebrow="R" title="Source Clocks">
          <dl className="grid gap-3 sm:grid-cols-2">
            {view.clocks.map((c) => (
              <div key={c.id} className="rounded-lg border bg-white p-4">
                <dt className="text-sm font-semibold text-[#0A2540]">{c.label}</dt>
                <dd className="mt-1 text-sm text-muted-foreground">{c.value}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <Section id="limitations" eyebrow="S" title="Known Data Limitations">
          <ul className="list-disc space-y-2 pl-5">
            <li>Unresolved DFS appointer identity remains unresolved.</li>
            <li>No county market inference from addresses, appointments, or company locations.</li>
            <li>No rankings or Trust Scores from these layers.</li>
            <li>People remain unpublished. Legal-insurer graph pages remain unpublished.</li>
            <li>MIR, surplus-lines, and regulatory evidence are not copied onto agency profiles by name.</li>
            <li>Existing public provider population is not expanded by this page.</li>
          </ul>
        </Section>
      </div>
      <DisclaimerBanner />
    </>
  );
}
