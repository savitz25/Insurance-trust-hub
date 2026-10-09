import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo/metadata';
import market from '@/lib/wisconsin-intelligence/market-conduct.json';
import financial from '@/lib/wisconsin-intelligence/financial-exams.json';
import { StateHubLinks } from '@/components/hubs/state-hub-links';

export const metadata: Metadata = buildMetadata({
  title: 'Wisconsin insurance licensing and OCI regulatory evidence',
  description: 'Wisconsin OCI insurer-category counts, company and producer verification, administrative actions, market-conduct and financial-examination indexes.',
  path: '/wisconsin',
});

const fmt = (n: number) => n.toLocaleString('en-US');
const official = (url: string, label: string) => <a className="font-medium text-sky-700 underline underline-offset-2" href={url} rel="noopener noreferrer" target="_blank">{label}</a>;
const tableA = 'https://oci.wi.gov/Documents/AboutOCI/2025_WIR_Table_A.pdf';
const directory = 'https://oci.wi.gov/Documents/AboutOCI/2025_WIR_Directory.pdf';
const lookup = 'https://oci.wi.gov/Pages/Consumers/Look-Up.aspx';
const actions = 'https://oci.wi.gov/Pages/PressReleases/AdminActions.aspx';
const complaints = 'https://oci.wi.gov/Pages/Consumers/Filing-a-Complaint.aspx';
const classes = [
  ['Life/health', 434], ['Fraternals', 36], ['HMOs', 21],
  ['Limited-service health organizations', 4], ['Property/casualty', 1003],
  ['Domestic surplus lines', 4], ['Reciprocal exchanges', 21],
  ['Town mutuals', 3], ['Title insurers', 25],
] as const;

export default function WisconsinInsurancePage() {
  const generatedAt = new Date().toISOString();
  return <main className="th-shell mx-auto w-full max-w-[960px] px-4 py-8 sm:py-10">
    <nav aria-label="Breadcrumb" className="mb-4 text-sm"><Link href="/" className="text-sky-700 underline">Home</Link><span aria-hidden="true"> / </span>Wisconsin research</nav>
    <header><p className="text-xs font-semibold uppercase tracking-wider text-sky-700">Wisconsin · OCI regulator evidence</p><h1 className="mt-2 text-3xl font-bold text-[#0A2540]">Wisconsin insurance licensing and regulatory records</h1><p className="mt-3 max-w-3xl text-slate-700">The Wisconsin Office of the Commissioner of Insurance (OCI) publishes an annual insurer directory and category table, current lookup paths, administrative-action summaries, and separate examination indexes. A legal insurer, agency, individual producer and appointment are different records.</p></header>

    <section aria-label="Wisconsin evidence summary" className="mt-8 grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-slate-200 bg-white p-5"><strong className="text-3xl text-[#0A2540]">1,551</strong><p className="mt-1 text-sm">OCI Table A insurer-category entries as of December 31, 2025; multiple licenses can belong to one entity</p></div>
      <div className="rounded-xl border border-slate-200 bg-white p-5"><strong className="text-3xl text-[#0A2540]">{fmt(market.rowCount)}</strong><p className="mt-1 text-sm">OCI market-conduct report-index rows; {market.recent2022to2026} dated 2022–2026</p></div>
      <div className="rounded-xl border border-slate-200 bg-white p-5"><strong className="text-3xl text-[#0A2540]">{fmt(financial.rowCount)}</strong><p className="mt-1 text-sm">OCI financial-exam report-index rows; {financial.recent2022to2026} dated 2022–2026</p></div>
    </section>

    <section id="companies" className="mt-10"><h2 className="text-2xl font-semibold text-[#0A2540]">Insurer classes and company verification</h2><p className="mt-2 text-sm text-slate-700">OCI&apos;s {official(tableA, '2025 Table A')} prints the following nine classes. Its 1,551 subtotal counts category/license entries, not distinct legal companies: OCI warns that an entity may hold multiple licenses. Another 494 limited-regulation entity entries sit in a separate subtotal and are not added to the insurer figure. The {official(directory, '2025 licensed-insurer directory')} prints company names and types but no NAIC codes. Current company status requires {official(lookup, 'OCI/SBS verification')}.</p><div className="mt-4 grid gap-2 sm:grid-cols-3">{classes.map(([name, count]) => <p key={name} className="rounded-lg border border-slate-200 p-3 text-sm"><strong>{fmt(count)}</strong> {name} entries</p>)}</div><p className="mt-3 text-sm text-slate-700">Company-level source rows and NAIC codes: NOT_ACQUIRED. Exact NAIC intersections with canonical legal-insurer identities: NOT_ACQUIRED. This is missing evidence, not zero companies or zero matches.</p></section>

    <section id="producers" className="mt-10"><h2 className="text-2xl font-semibold text-[#0A2540]">Agencies, individual producers and appointments</h2><p className="mt-2 text-sm text-slate-700">OCI directs agency/business-entity and individual-producer license checks to {official(lookup, 'State Based Systems (SBS) lookup')}. Both verification capabilities are KNOWN. Statewide agency, person, appointment and exact NPN bulk rosters are NOT_ACQUIRED. An NPN requires a source result to establish its business or person grain. No person record becomes a business profile.</p></section>

    <section id="enforcement" className="mt-10"><h2 className="text-2xl font-semibold text-[#0A2540]">Administrative actions</h2><p className="mt-2 text-sm text-slate-700">OCI publishes {official(actions, 'monthly administrative-action summaries and an order-search path')} for insurers, agencies and producers. The 2022–2026 provider-level action corpus is NOT_ACQUIRED: monthly summaries do not consistently print a license, NAIC or NPN, and the order lookup requires individual verification. Exact adverse attachments: 0; name-only adverse joins: 0. A summary may describe allegations alongside an action; allegations are not independent final findings.</p></section>

    <section id="exams" className="mt-10"><h2 className="text-2xl font-semibold text-[#0A2540]">Market conduct and financial examinations</h2><p className="mt-2 text-sm text-slate-700">The {official(market.source, 'OCI market-conduct index')} has {fmt(market.rowCount)} published report links and printed exam dates; {market.recent2022to2026} show 2022–2026 dates. The {official(financial.source, 'OCI financial-exam index')} has {fmt(financial.rowCount)} links and report as-of dates; {financial.recent2022to2026} show 2022–2026 dates. These are index entries, not a complete historical exam census, enforcement actions, adverse findings or unique company counts. The indexes omit NAIC, so no company profile was linked by name.</p><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[540px] text-left text-sm"><caption className="mb-2 text-left font-semibold">Recent indexed report examples</caption><thead><tr><th className="py-2">Type</th><th>Company as printed</th><th>Report as of</th><th>Source</th></tr></thead><tbody>{[...market.rows.filter(r => /202[2-6]/.test(r.asOfAsPrinted)).slice(0, 1).map(r => ({...r, type: 'Market conduct'})), ...financial.rows.filter(r => /202[2-6]/.test(r.asOfAsPrinted)).slice(0, 5).map(r => ({...r, type: 'Financial'}))].map((r, i) => <tr key={`${r.type}-${i}`} className="border-t border-slate-200"><td className="py-2 pr-2">{r.type}</td><td className="pr-2">{r.company}</td><td className="pr-2 whitespace-nowrap">{r.asOfAsPrinted}</td><td>{r.sourceDocument ? official(r.sourceDocument, 'OCI report') : 'Index only'}</td></tr>)}</tbody></table></div></section>

    <section id="complaints" className="mt-10"><h2 className="text-2xl font-semibold text-[#0A2540]">Complaints</h2><p className="mt-2 text-sm text-slate-700">OCI {official(complaints, 'accepts consumer insurance complaints')}. Intake is KNOWN. Provider-level complaint cases and outcomes are NOT_ACQUIRED; outcomes may require a records request. OCI also offers a separate {official('https://oci.wi.gov/Pages/Consumers/GrievanceReport.aspx', 'health-insurer grievance report')} by company and plan type; those grievance aggregates were not acquired and are not complaint-case or enforcement rows. A complaint is not an enforcement finding.</p></section>

    <section id="clocks" className="mt-10 border-t border-slate-200 pt-6"><h2 className="text-xl font-semibold text-[#0A2540]">Source clocks and limits</h2><p className="mt-2 text-sm text-slate-700">Table A and company directory: December 31, 2025 snapshot, retrieved September 29, 2026. OCI lookup page: last updated July 17, 2026; individual live status was not snapshotted. Administrative-actions landing page: last updated September 2, 2026; individual action dates remain in source summaries, corpus NOT_ACQUIRED. Market-conduct and financial indexes: retrieved {market.retrievedAt} and {financial.retrievedAt}, with separate report dates on each row. Page generated {generatedAt}. No universal Wisconsin insurance as-of date is asserted.</p><p className="mt-2 text-sm text-slate-700">Exact agency/license matches: NOT_ACQUIRED. Exact enforcement attachments: 0. New canonical organizations: 0. Graph writes: 0. Claim eligibility changes: 0. Statewide NAIC-bearing company rows, agency and producer rosters, appointments, complete administrative-action corpus, provider complaint cases and outcomes: NOT_ACQUIRED.</p><p className="mt-3 text-sm"><Link className="text-sky-700 underline" href="/ask?q=Wisconsin%20insurance%20license">Ask about Wisconsin OCI evidence</Link></p></section>
    <StateHubLinks stateSlug="wisconsin" />
  </main>;
}
