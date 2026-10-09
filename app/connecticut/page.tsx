import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo/metadata';
import { CT_INS_PUBLICATION, CT_INS_SOURCES } from '@/lib/connecticut-intelligence/publication';
import roster from '@/lib/connecticut-intelligence/company-roster.json';
import market from '@/lib/connecticut-intelligence/market-conduct.json';
import orders from '@/lib/connecticut-intelligence/consent-orders-2026.json';
import financial from '@/lib/connecticut-intelligence/financial-exams.json';
import { StateHubLinks } from '@/components/hubs/state-hub-links';

export const metadata: Metadata = buildMetadata({
  title: CT_INS_PUBLICATION.title,
  description: CT_INS_PUBLICATION.description,
  path: CT_INS_PUBLICATION.path,
});

type Props = { searchParams: Promise<{ naic?: string }> };
const fmt = (n: number) => n.toLocaleString('en-US');
const official = (url: string, label: string) => <a className="font-medium text-sky-700 underline underline-offset-2" href={url} rel="noopener noreferrer" target="_blank">{label}</a>;
const selectedTypes = ['Property Casualty', 'Life plus Accident and Health', 'Excess and Surplus Lines', 'Accredited', 'Certified Reinsurer'];

export default async function ConnecticutInsurancePage({ searchParams }: Props) {
  const params = await searchParams;
  const naic = typeof params.naic === 'string' && /^\d{5}$/.test(params.naic) ? params.naic : '';
  const exactRows = naic ? roster.rows.filter((row) => row.naic === naic) : [];
  const recentOrders = orders.rows.slice(0, 8);
  const generatedAt = new Date().toISOString();

  return <main className="th-shell mx-auto w-full max-w-[960px] px-4 py-8 sm:py-10">
    <nav aria-label="Breadcrumb" className="mb-4 text-sm"><Link href="/" className="text-sky-700 underline">Home</Link><span aria-hidden="true"> / </span>Connecticut research</nav>
    <header>
      <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">Connecticut · statewide CID evidence</p>
      <h1 className="mt-2 text-3xl font-bold text-[#0A2540]">Connecticut insurance licensing and regulatory evidence</h1>
      <p className="mt-3 max-w-3xl text-slate-700">The Connecticut Insurance Department (CID) publishes a company list with legal-company type and NAIC code, while State Based Systems (SBS) verifies agency and individual producer licenses. An insurer is not an agency; a producer person is not an agency; an appointment is not a license.</p>
    </header>

    <section aria-label="Evidence summary" className="mt-8 grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-slate-200 bg-white p-5"><strong className="text-3xl text-[#0A2540]">{fmt(roster.rowCount)}</strong><p className="mt-1 text-sm">CID company-list rows as of {roster.asOf}, including distinct insurer, surplus-lines and reinsurance categories</p></div>
      <div className="rounded-xl border border-slate-200 bg-white p-5"><strong className="text-3xl text-[#0A2540]">{fmt(roster.rowsWithExactNaic)}</strong><p className="mt-1 text-sm">Company-list rows printing an exact NAIC code; {fmt(roster.distinctNaicCount)} distinct codes</p></div>
      <div className="rounded-xl border border-slate-200 bg-white p-5"><strong className="text-3xl text-[#0A2540]">{fmt(market.rowCount)}</strong><p className="mt-1 text-sm">CID market-conduct index entries dated 2022–2026; not a unique-company count</p></div>
    </section>

    <section id="license" className="mt-10"><h2 className="text-2xl font-semibold text-[#0A2540]">Verify the right license grain</h2>
      <p className="mt-2 text-sm text-slate-700">The company PDF covers licensed insurers, approved/accredited reinsurers and surplus-lines insurers. Its company-type column must be read before treating a row as an admitted insurer. The PDF has no current-status or expiration field; confirm present authority in the CID/SBS lookup.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4"><h3 className="font-semibold">Legal insurance company</h3><p className="mt-1 text-sm">Exact NAIC code identifies a legal company, not a brand or agency. The list may repeat one NAIC across company categories.</p><p className="mt-2 text-sm">{official(CT_INS_SOURCES.companyList, 'CID company list PDF')} · {official(CT_INS_SOURCES.companyLookup, 'Find an insurance company')}</p></div>
        <div className="rounded-xl border border-slate-200 p-4"><h3 className="font-semibold">Agency / producer business entity</h3><p className="mt-1 text-sm">A producer business has its own license; it is not an insurer or the license of an individual employee. SBS verification is known. Bulk agency roster: NOT_ACQUIRED.</p><p className="mt-2 text-sm">{official(CT_INS_SOURCES.businessProducer, 'CID business-entity licensing')} · {official(CT_INS_SOURCES.licensing, 'SBS lookup access')}</p></div>
        <div className="rounded-xl border border-slate-200 p-4"><h3 className="font-semibold">Individual producer / adjuster</h3><p className="mt-1 text-sm">SBS can verify a person’s license and published disciplinary documents. A person NPN does not become a business profile. Bulk person and adjuster rosters: NOT_ACQUIRED.</p><p className="mt-2 text-sm">{official(CT_INS_SOURCES.licensing, 'CID license lookup')} · {official(CT_INS_SOURCES.disciplinaryLookup, 'Disciplinary-document guidance')}</p></div>
        <div className="rounded-xl border border-slate-200 p-4"><h3 className="font-semibold">Appointments and surplus lines</h3><p className="mt-1 text-sm">An appointment is an insurer–producer relationship, not another license. CID directs company appointment lists to SBS; appointment bulk: NOT_ACQUIRED. Surplus-lines company rows retain their printed class.</p><p className="mt-2 text-sm">{official(CT_INS_SOURCES.appointment, 'CID appointment guidance')}</p></div>
      </div>
      <div className="mt-5 rounded-xl border border-slate-200 p-4"><h3 className="font-semibold">Exact company-list classes</h3><div className="mt-3 grid gap-2 sm:grid-cols-3">{selectedTypes.map((type) => <p className="rounded-lg bg-slate-50 p-3 text-sm" key={type}><strong>{fmt(roster.companyTypeCounts[type as keyof typeof roster.companyTypeCounts])}</strong> {type} rows</p>)}</div><p className="mt-3 text-xs text-slate-600">These are source-row classes, not an additive Connecticut-insurer total. Other printed classes remain in the source snapshot.</p></div>
      <form action="/connecticut" className="mt-5 flex max-w-xl gap-2"><label htmlFor="naic" className="sr-only">Exact five-digit NAIC company code</label><input id="naic" name="naic" inputMode="numeric" defaultValue={naic} placeholder="Exact five-digit NAIC company code" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2"/><button className="rounded-lg bg-[#0A2540] px-4 py-2 text-white">Check CID list</button></form>
      {naic && <div className="mt-4 rounded-xl border border-slate-200 p-4"><h3 className="font-semibold">NAIC {naic} · {exactRows.length} company-list row(s)</h3>{exactRows.length ? <ul className="mt-2 space-y-2 text-sm">{exactRows.map((row, i) => <li key={`${row.naic}-${row.companyTypeAsPrinted}-${i}`}>{row.companyAsPrinted} · {row.companyTypeAsPrinted} · {row.domicileType} {row.domicileState ?? ''}</li>)}</ul> : <p className="mt-2 text-sm">No row in this dated PDF. This is not proof of no current Connecticut authority; check SBS.</p>}</div>}
    </section>

    <section id="enforcement" className="mt-10"><h2 className="text-2xl font-semibold text-[#0A2540]">Market conduct and consent orders</h2><p className="mt-2 text-sm text-slate-700">The CID market-conduct index contains {fmt(market.dispositionCounts.Fined)} entries labeled “Fined” and {fmt(market.dispositionCounts['Review Completed'])} labeled “Review Completed” from 2022 through the current 2026 index. A row is an examination/disposition entry, not a unique company or a complete licensee-enforcement catalog. In 2026, {orders.rowCount} linked PDFs were confirmed as stipulation and consent orders; docket numbers are retained only where printed and readable. No order was attached to a profile by name.</p>
      <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[600px] text-left text-sm"><caption className="mb-2 text-left font-semibold">2026 PDF-confirmed stipulation and consent orders</caption><thead><tr><th className="py-2">Index closed date</th><th>Respondent as indexed</th><th>Docket</th><th>Source</th></tr></thead><tbody>{recentOrders.map((row) => <tr key={row.sourceDocument} className="border-t border-slate-200"><td className="py-2 pr-2 whitespace-nowrap">{row.examClosedDate}</td><td className="pr-2">{row.respondentAsIndexed}</td><td className="pr-2 whitespace-nowrap">{row.docketNumber ?? 'Not legible'}</td><td>{official(row.sourceDocument, 'CID PDF')}</td></tr>)}</tbody></table></div>
      <p className="mt-3 text-sm">{official(CT_INS_SOURCES.marketExams, 'CID market-conduct index')} · {official(CT_INS_SOURCES.licenseInvestigations, 'CID licensee investigations')} · {official(CT_INS_SOURCES.disciplinaryLookup, 'SBS action lookup')}</p>
      <p className="mt-2 text-sm text-slate-700">Licensee actions for agencies, producers and adjusters are searchable through SBS, but a statewide bulk action roster was NOT_ACQUIRED. “Fined” is the CID index label; allegations or complaints are not treated as findings.</p>
    </section>

    <section id="examinations" className="mt-10"><h2 className="text-2xl font-semibold text-[#0A2540]">Financial examinations</h2><p className="mt-2 text-sm text-slate-700">CID publishes {financial.rowCount} financial-examination index rows with company name, examination as-of date, type and source report for 2022–2024. These dates are report as-of dates, not license-status or publication clocks. The index does not print NAIC codes; no name-only attachment was made.</p><p className="mt-3 text-sm">{official(CT_INS_SOURCES.financialExams, 'CID financial-examination index')}</p></section>

    <section id="complaints" className="mt-10"><h2 className="text-2xl font-semibold text-[#0A2540]">Complaints</h2><p className="mt-2 text-sm text-slate-700">CID accepts complaints about insurers, agents and adjusters. Intake capability is known; provider-level complaint case rows and outcomes were NOT_ACQUIRED. A complaint is not an enforcement finding.</p><p className="mt-3 text-sm">{official(CT_INS_SOURCES.complaints, 'File a CID complaint')}</p></section>

    <section id="clocks" className="mt-10 border-t border-slate-200 pt-6"><h2 className="text-xl font-semibold text-[#0A2540]">Source clocks, identity and limits</h2><p className="mt-2 text-sm text-slate-700">Company PDF as of {roster.asOf}, retrieved {roster.retrievedAt}. Market-conduct index and consent PDFs retrieved {market.retrievedAt}; each row retains its exam closed date, which is not necessarily the order signing date. Financial index retrieved {financial.retrievedAt}; each row retains its report as-of date. Page generated {generatedAt}. SBS license status is live and was not snapshotted.</p><p className="mt-2 text-sm text-slate-700">Exact NAIC cross-check: {fmt(roster.exactNaicRowsAlreadyInCanonicalIndex)} company-list rows share a code with {fmt(roster.distinctExactCanonicalNaics)} existing legal-insurer identities; {fmt(roster.unmatchedExactNaicRows)} NAIC-bearing rows do not. These are read-only code intersections, not new identities or evidence attachments. Agency NPN rows: NOT_ACQUIRED. Producer NPN rows: NOT_ACQUIRED. Exact enforcement attachments: 0. Name-only adverse joins: 0. New canonical organizations: 0. Graph writes: 0. Claim eligibility unchanged.</p><p className="mt-3 text-sm"><Link className="text-sky-700 underline" href="/ask?q=Connecticut%20insurance%20agency">Ask about Connecticut insurance evidence</Link></p></section>
    <StateHubLinks stateSlug="connecticut" />
  </main>;
}
