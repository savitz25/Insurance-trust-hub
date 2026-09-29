import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo/metadata';
import companies from '@/lib/maryland-intelligence/companies.json';
import index from '@/lib/maryland-intelligence/order-exam-index.json';
import enforcement from '@/lib/maryland-intelligence/producer-enforcement.json';

export const metadata: Metadata = buildMetadata({
  title: 'Maryland insurance companies and MIA regulatory evidence',
  description: 'Maryland Insurance Administration company licensing, exact NAIC research, agency and producer verification, orders, producer enforcement, and examination indexes.',
  path: '/maryland',
});

type Props = { searchParams: Promise<{ naic?: string }> };
const fmt = (n: number) => n.toLocaleString('en-US');
const link = (url: string, label: string) => <a className="font-medium text-sky-700 underline underline-offset-2" href={url} rel="noopener noreferrer" target="_blank">{label}</a>;
const sourceHome = 'https://insurance.maryland.gov/consumer/pages/companysearchinstructions.aspx';
const agencySearch = 'https://www.apps.insurance.maryland.gov/CompanyProducerInfo/';
const complaintSource = 'https://insurance.maryland.gov/consumer/pages/fileacomplaint.aspx';
const byCategory = (name: string) => index.rows.filter((row) => row.category === name);
const orders = byCategory('Order');
const market = byCategory('Market Conduct Exams');
const financial = byCategory('Financial Exams');
const civil = byCategory('27-1001 - First Party Good Faith Civil Complaints');

export default async function MarylandInsurancePage({ searchParams }: Props) {
  const params = await searchParams;
  const naic = typeof params.naic === 'string' && /^\d{5}$/.test(params.naic) ? params.naic : '';
  const matches = naic ? companies.rows.filter((row) => row.naic === naic) : [];
  const generatedAt = new Date().toISOString();
  return <main className="th-shell mx-auto w-full max-w-[960px] px-4 py-8 sm:py-10">
    <nav aria-label="Breadcrumb" className="mb-4 text-sm"><Link href="/" className="text-sky-700 underline">Home</Link><span aria-hidden="true"> / </span>Maryland research</nav>
    <header><p className="text-xs font-semibold uppercase tracking-wider text-sky-700">Maryland · MIA regulator evidence</p><h1 className="mt-2 text-3xl font-bold text-[#0A2540]">Maryland insurance licensing and regulatory records</h1><p className="mt-3 max-w-3xl text-slate-700">The Maryland Insurance Administration (MIA) publishes a Company search, a separate Other Licensed Entity search, producer and agency verification, orders and examination reports. Each is a different record grain. MIA does not rank insurance companies.</p></header>

    <section aria-label="Maryland evidence summary" className="mt-8 grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-slate-200 bg-white p-5"><strong className="text-3xl text-[#0A2540]">{fmt(companies.rowCount)}</strong><p className="mt-1 text-sm">MIA Company-search rows, including active and historical statuses</p></div>
      <div className="rounded-xl border border-slate-200 bg-white p-5"><strong className="text-3xl text-[#0A2540]">{fmt(companies.distinctNaic)}</strong><p className="mt-1 text-sm">Distinct five-digit NAIC codes across {fmt(companies.rowsWithNaic)} Company rows</p></div>
      <div className="rounded-xl border border-slate-200 bg-white p-5"><strong className="text-3xl text-[#0A2540]">{fmt(index.rowCount)}</strong><p className="mt-1 text-sm">Bounded MIA company and agency order/exam index rows, 2022–2026; some annual results capped</p></div>
    </section>

    <section id="companies" className="mt-10"><h2 className="text-2xl font-semibold text-[#0A2540]">Company licensing and exact NAIC identity</h2><p className="mt-2 text-sm text-slate-700">The {fmt(companies.rowCount)} Company-class search rows have distinct printed statuses. {fmt(companies.statusCounts['Active Company - No Regulatory Action'])} say “Active Company - No Regulatory Action”; that status is not an adverse order. {fmt(companies.otherLicensedEntityCount)} separate Other Licensed Entity search rows are kept outside the Company total. Company business type, domicile, lines of business and application dates require individual detail views and are NOT_ACQUIRED in this roster snapshot.</p>
      <form action="/maryland" className="mt-5 flex max-w-xl gap-2"><label htmlFor="naic" className="sr-only">Exact five-digit NAIC company code</label><input id="naic" name="naic" inputMode="numeric" defaultValue={naic} placeholder="Exact five-digit NAIC code" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2"/><button className="rounded-lg bg-[#0A2540] px-4 py-2 text-white">Check snapshot</button></form>
      {naic && <div className="mt-4 rounded-xl border border-slate-200 p-4"><h3 className="font-semibold">NAIC {naic}: {matches.length} MIA Company row(s)</h3>{matches.length ? <ul className="mt-2 space-y-2 text-sm">{matches.map((row) => <li key={row.sourceCompanyId}>{row.name} · {row.status}</li>)}</ul> : <p className="mt-2 text-sm">No row in this retrieved snapshot. Check the current MIA search; absence here does not establish current license status.</p>}</div>}
      <p className="mt-3 text-sm">{link(companies.source, 'MIA Company search')} · {link(sourceHome, 'MIA search field guidance')}. Exact NAIC read-only intersection: {fmt(companies.exactCanonicalNaicRows)} Company rows, {fmt(companies.distinctCanonicalNaics)} distinct existing legal-insurer codes, and {fmt(companies.unmatchedNaicRows)} unmatched NAIC-bearing rows. This does not create a profile or attach an adverse event.</p>
    </section>

    <section id="producers" className="mt-10"><h2 className="text-2xl font-semibold text-[#0A2540]">Agencies and individual producers</h2><p className="mt-2 text-sm text-slate-700">MIA provides separate {link(agencySearch, 'producer firm/agency and individual producer searches')}. Agency verification and person verification are KNOWN; statewide agency and individual-producer rosters are NOT_ACQUIRED. A producer person, producer firm and insurer are not interchangeable. An NPN needs an exact source result to establish whether it belongs to a firm or a person. No public business profile is created from a person record.</p></section>

    <section id="orders" className="mt-10"><h2 className="text-2xl font-semibold text-[#0A2540]">Orders and producer enforcement</h2><p className="mt-2 text-sm text-slate-700">The {fmt(index.rowCount)} bounded MIA index rows retain respondent, respondent grain, document number, signed date, division, category and displayed status. {fmt(orders.length)} are labeled Order; {fmt(civil.length)} have the separate first-party good-faith civil-complaint category. An index row is not automatically adverse. Company searches for 2022, 2023 and 2025 each reached the interface’s 150-row ceiling; counts here are captured rows, not a census.</p>
      <p className="mt-3 text-sm">MIA’s {link('https://insurance.maryland.gov/Pages/available-public-information/ProducerEnforcementSummaries.aspx', 'annual Producer Enforcement Summaries')} yielded {fmt(enforcement.rowCount)} bounded 2022–2026 rows with printed name, number where available, order type, order number, action and action date. Ambiguous combined producer/agency rows retain unresolved grain. No person is attached to a company by name.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-5">{enforcement.sources.map((source) => <a className="rounded-lg border border-slate-200 p-3 text-sm text-sky-700 underline" key={source.year} href={source.url}>202{source.year - 2020}: {source.rows} rows</a>)}</div>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><thead><tr><th className="py-2">Signed</th><th>Respondent</th><th>Document</th><th>Category</th><th>Displayed status</th></tr></thead><tbody>{orders.slice(0, 12).map((row, i) => <tr key={`${row.sourceDocumentId}-${i}`} className="border-t border-slate-200"><td className="py-2 pr-2 whitespace-nowrap">{row.signedDate}</td><td className="pr-2">{row.respondent} ({row.respondentGrain})</td><td className="pr-2">{row.documentName}</td><td className="pr-2">{row.category}</td><td>{row.displayedStatus}</td></tr>)}</tbody></table></div><p className="mt-2 text-sm">{link(index.sources[0].url, 'Official company order/exam search')} · {link(index.sources.at(-1)!.url, 'Official agency order/exam search')}. Showing 12 captured order rows; use MIA for the current record and document.</p>
    </section>

    <section id="exams" className="mt-10"><h2 className="text-2xl font-semibold text-[#0A2540]">Market-conduct and financial examinations</h2><p className="mt-2 text-sm text-slate-700">The same bounded MIA index contains {fmt(market.length)} rows labeled Market Conduct Exams and {fmt(financial.length)} labeled Financial Exams. These are document-index rows, not enforcement orders, unique company counts or exam findings. Signed/index dates are retained on each row; report-period details are not inferred from document names. Individual exam PDFs were not bulk parsed.</p><p className="mt-3 text-sm">{link(index.sources[0].url, 'MIA examination search')}</p></section>

    <section id="complaints" className="mt-10"><h2 className="text-2xl font-semibold text-[#0A2540]">Complaints and fraud</h2><p className="mt-2 text-sm text-slate-700">MIA accepts insurance company and producer complaints and investigates suspected insurance fraud. Intake and investigation capabilities are KNOWN; provider-level complaint outcomes and fraud orders are NOT_ACQUIRED. The civil-complaint document category above is not a provider complaint-history corpus. A complaint is not a finding.</p><p className="mt-3 text-sm">{link(complaintSource, 'MIA complaint and fraud reporting')}</p></section>

    <section id="clocks" className="mt-10 border-t border-slate-200 pt-6"><h2 className="text-xl font-semibold text-[#0A2540]">Source clocks and limits</h2><p className="mt-2 text-sm text-slate-700">MIA says Company and Producer Information is updated weekly; the precise update instant and per-company status clock are not displayed. Company roster retrieved {companies.retrievedAt}. Order/exam index retrieved {index.retrievedAt}, with individual signed dates on rows. Producer summaries retrieved {enforcement.retrievedAt}, with separate action dates. Page generated {generatedAt}. No single Maryland insurance “as of” date is asserted.</p><p className="mt-2 text-sm text-slate-700">Exact agency/license matches: 0; exact enforcement attachments: 0; name-only adverse joins: 0; new canonical organizations: 0; graph writes: 0; claim eligibility changes: 0. Agency and producer rosters, complete company business types, individual exam PDF findings, provider-level complaint outcomes and a complete uncapped order census remain NOT_ACQUIRED.</p><p className="mt-3 text-sm"><Link className="text-sky-700 underline" href="/ask?q=Maryland%20insurance%20license">Ask about Maryland MIA evidence</Link></p></section>
  </main>;
}
