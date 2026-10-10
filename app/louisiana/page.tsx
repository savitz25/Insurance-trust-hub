import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo/metadata';
import table from '@/lib/louisiana-intelligence/fy2025-table-17.json';
import { StateHubLinks } from '@/components/hubs/state-hub-links';

export const metadata: Metadata = buildMetadata({
  title: 'Louisiana insurance licensing and LDI regulatory evidence',
  description:
    'Louisiana LDI fiscal-year-end entity-category entries, separate company and producer searches, appointments, and complaint intake. Category entries are not distinct companies.',
  path: '/louisiana',
});

const fmt = (n: number) => n.toLocaleString('en-US');
const official = (url: string, label: string) => (
  <a className="font-medium text-sky-700 underline underline-offset-2" href={url} rel="noopener noreferrer" target="_blank">
    {label}
  </a>
);

const annualReport = table.source;
const companySearch = 'https://ldi.la.gov/onlineservices/ActiveCompanySearch';
const producerSearch = 'https://ldi.la.gov/onlineservices/producersearch';
const producerGuide = 'https://ldi.la.gov/industry/producer-adjuster/search-for-producers-and-adjusters';
const licenseeReports = 'https://ldi.la.gov/industry/producer-adjuster/search-for-producers-and-adjusters/producer-adjuster-licensee-report';
const appointments = 'https://ldi.la.gov/industry/producer-adjuster/agency-affiliations-information/company-appointment';
const complaints = 'https://www.ldi.la.gov/onlineservices/ConsumerComplaintForm';
const actions = 'https://www.ldi.la.gov/OnlineServices/RegulatoryActions';
const marketConduct = 'https://www.ldi.la.gov/industry/resources-and-publications/market-conduct';
const riskRows = [
  ...table.riskBearing.domestic,
  ...table.riskBearing.nonDomiciliary,
  ...table.riskBearing.other,
];

export default function LouisianaInsurancePage() {
  return (
    <main className="th-shell mx-auto w-full max-w-[960px] px-4 py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <Link href="/" className="text-sky-700 underline">Home</Link>
        <span aria-hidden="true"> / </span>Louisiana research
      </nav>
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">Louisiana · LDI regulator evidence</p>
        <h1 className="mt-2 text-3xl font-bold text-[#0A2540]">Louisiana insurance licensing and regulatory records</h1>
        <p className="mt-3 max-w-3xl text-slate-700">
          The Louisiana Department of Insurance (LDI) publishes a fiscal-year-end category table, a company search, and a separate producer and adjuster search. A legal insurer, an individual producer, an agency, an adjuster, and a company appointment are different records. They are not added together.
        </p>
      </header>

      <section aria-label="Louisiana evidence summary" className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <strong className="text-3xl text-[#0A2540]">{fmt(table.riskBearing.total)}</strong>
          <p className="mt-1 text-sm">Table 17 risk-bearing category entries at fiscal year-end June 30, 2025. These are not distinct companies. The surplus-lines row is estimated by LDI.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <strong className="text-3xl text-[#0A2540]">{fmt(table.nonRiskBearingSubtotal)}</strong>
          <p className="mt-1 text-sm">Table 17 non-risk-bearing registration entries, including TPAs and viatical settlement records. Not an insurer census and not added to the risk-bearing figure.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <strong className="text-lg text-[#0A2540]">NOT_ACQUIRED</strong>
          <p className="mt-1 text-sm">Individual, agency, adjuster, and appointment headcounts are null. Producer search is OPEN_SEARCH_ONLY.</p>
        </div>
      </section>

      <section id="companies" className="mt-10">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Insurer categories and company verification</h2>
        <p className="mt-2 text-sm text-slate-700">
          LDI&apos;s {official(annualReport, '2024-2025 Annual Report')} Table 17 prints entities licensed or registered at fiscal year-end. The fiscal year began July 1, 2024 and ended June 30, 2025. Category entries are not distinct companies. A printed zero in a registration row is that row&apos;s printed entry, not a finding that producers or companies are zero. The printed grand total of {fmt(table.printedGrandTotal)} adds risk-bearing and non-risk-bearing rows and is not a company, producer, or adjuster census.
        </p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {riskRows.map((row) => (
            <p key={row.name} className="rounded-lg border border-slate-200 p-3 text-sm">
              <strong>{fmt(row.count)}</strong> {row.name} entries
            </p>
          ))}
        </div>
        <p className="mt-3 text-sm text-slate-700">
          Subtotals as printed: {fmt(table.riskBearing.domesticSubtotal)} domestic, {fmt(table.riskBearing.nonDomiciliarySubtotal)} non-domiciliary, {fmt(table.riskBearing.otherSubtotal)} other risk-bearing. Current company status requires {official(companySearch, 'LDI Active Company Search')}. That search also covers third-party administrators, medical necessity review organizations, and viatical providers and brokers. Those license types are not folded into the risk-bearing entries. Table 17 does not print a separate MNRO row, so no MNRO count is stated. Company-level source rows and NAIC codes: NOT_ACQUIRED. Exact NAIC intersections with canonical legal-insurer identities: NOT_ACQUIRED. This is missing evidence, not zero companies or zero matches.
        </p>
        <h3 className="mt-6 text-lg font-semibold text-[#0A2540]">Non-risk-bearing registrations</h3>
        <p className="mt-2 text-sm text-slate-700">These Table 17 rows are not insurers. They stay in their own grain.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {table.nonRiskBearing.map((row) => (
            <p key={row.name} className="rounded-lg border border-slate-200 p-3 text-sm">
              <strong>{fmt(row.count)}</strong> {row.name} entries
            </p>
          ))}
        </div>
      </section>

      <section id="producers" className="mt-10">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Individuals, agencies, adjusters, and appointments</h2>
        <p className="mt-2 text-sm text-slate-700">
          {official(producerSearch, 'LDI producer and adjuster search')} and the {official(producerGuide, 'producer and adjuster search guide')} cover individuals, agencies, and adjusters in one search. That search is not one agents total. The guide also links {official(licenseeReports, 'Producer/Adjuster Licensee Reports')}, split by authority rather than published here as a single license-type census. One Life-authority file was retrieved on {table.licenseeRoster.retrievedAt}. Every observed row was Life authority, and the file includes appointment columns. ProducerType values in that file were Producer and Producer Agency, but a row was not established as one distinct licensee. Other authority files and adjuster files were not added. Individual count: null. Agency count: null. Adjuster count: null. Publication: OPEN_SEARCH_ONLY / NOT_ACQUIRED.
        </p>
        <p className="mt-3 text-sm text-slate-700">
          {official(appointments, 'Company appointments')} are made through NIPR. An appointment is not a license. Appointment count: null. The annual report also prints fiscal-year appointments-processed activity. That activity figure is not an appointment roster and is not published here as a headcount. No person record becomes a business profile.
        </p>
      </section>

      <section id="enforcement" className="mt-10">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Regulatory actions</h2>
        <p className="mt-2 text-sm text-slate-700">
          LDI&apos;s {official(actions, 'regulatory-action search')} describes final actions issued since January 1, 2016. The 2016–2026 action corpus is NOT_ACQUIRED. Exact adverse attachments: 0. Name-only adverse joins: 0. A database description is not a completed action census.
        </p>
      </section>

      <section id="exams" className="mt-10">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Market conduct and financial examinations</h2>
        <p className="mt-2 text-sm text-slate-700">
          LDI {official(marketConduct, 'describes market-conduct examinations and analysis')}. The annual report says the Financial Examinations Division examines domestic insurers at least once every five years. No market-conduct report index and no financial-examination report index were acquired. Exam-index rows: NOT_ACQUIRED. An exam is not an enforcement order, a complaint, or a company count. No company profile was linked by name.
        </p>
      </section>

      <section id="complaints" className="mt-10">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Complaints</h2>
        <p className="mt-2 text-sm text-slate-700">
          The Consumer Complaint Division accepts intake through the {official(complaints, 'LDI consumer complaint form')}. Intake is KNOWN. Provider-level complaint cases and outcomes are NOT_ACQUIRED. Complaint intake is not a complaint census, not an enforcement finding, and not a licensee count.
        </p>
      </section>

      <section id="clocks" className="mt-10 border-t border-slate-200 pt-6">
        <h2 className="text-xl font-semibold text-[#0A2540]">Source clocks and limits</h2>
        <p className="mt-2 text-sm text-slate-700">
          Table 17: fiscal year-end June 30, 2025, from the report transmitted {table.reportLetterDate}, retrieved {table.retrievedAt}. Active Company Search, producer and adjuster search, the licensee-report index, the regulatory-action search, and the complaint form were observed {table.retrievedAt}. Individual live license status was not snapshotted. The Life licensee file was retrieved the same day and was not used as a headcount. Page generated {table.generatedAt}. No universal Louisiana insurance as-of date is asserted.
        </p>
        <p className="mt-2 text-sm text-slate-700">
          Exact agency and license matches: NOT_ACQUIRED. Exact enforcement attachments: 0. New canonical organizations: 0. Graph writes: 0. Claim eligibility changes: 0. Statewide NAIC-bearing company rows, individual, agency, adjuster, and appointment rosters, the administrative-action corpus, examination indexes, and provider complaint cases: NOT_ACQUIRED. New Orleans, Baton Rouge, Shreveport, and Lafayette are geography only. No parish pages are published.
        </p>
        <p className="mt-3 text-sm">
          <Link className="text-sky-700 underline" href="/ask?q=Louisiana%20insurance%20license">Ask about Louisiana LDI evidence</Link>
        </p>
      </section>
      <StateHubLinks stateSlug="louisiana" />
    </main>
  );
}
