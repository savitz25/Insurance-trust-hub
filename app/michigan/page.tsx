import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo/metadata';
import { DIFS_SOURCES, MICHIGAN_INSURANCE_GATE } from '@/lib/michigan-intelligence/publication';
import decisions from '@/lib/michigan-intelligence/final-decisions.json';
import exams from '@/lib/michigan-intelligence/market-exams.json';
import audit from '@/lib/michigan-intelligence/linkage-audit.json';

export const metadata: Metadata = buildMetadata({
  title: MICHIGAN_INSURANCE_GATE.title,
  description: MICHIGAN_INSURANCE_GATE.description,
  path: MICHIGAN_INSURANCE_GATE.path,
});

type Props = { searchParams: Promise<{ system?: string; naic?: string; npn?: string }> };
const years = ['2026', '2025', '2024', '2023', '2022'];
const f = (n: number) => n.toLocaleString('en-US');
const official = (href: string, label: string) => <a className="font-medium text-sky-700 underline underline-offset-2" href={href} rel="noopener noreferrer" target="_blank">{label}</a>;

export default async function MichiganInsurancePage({ searchParams }: Props) {
  const p = await searchParams;
  const system = typeof p.system === 'string' && /^\d{6,9}$/.test(p.system) ? p.system : '';
  const naic = typeof p.naic === 'string' && /^\d{5}$/.test(p.naic) ? p.naic : '';
  const npn = typeof p.npn === 'string' && /^\d{5,12}$/.test(p.npn) ? p.npn : '';
  const exactActions = system ? decisions.rows.filter((r) => r.systemId === system) : npn ? decisions.rows.filter((r) => r.npn === npn) : [];
  const exactExams = naic ? exams.rows.filter((r) => r.naicCodesAsIndexed.split(/\D+/).includes(naic)) : [];
  const companyAgencyRows = decisions.rows.filter((r) => r.respondentGrain === 'agency/business entity producer').slice(0, 18);
  const identifiers = decisions.rows.filter((r) => r.systemId || r.npn || r.licenseNumber).length;
  const latestExam = exams.rows.reduce((latest, row) => row.reportDate > latest ? row.reportDate : latest, '');
  const generatedAt = new Date().toISOString();

  return <main className="th-shell mx-auto w-full max-w-[960px] px-4 py-8 sm:py-10">
    <nav aria-label="Breadcrumb" className="mb-4 text-sm"><Link href="/" className="text-sky-700 underline">Home</Link><span aria-hidden="true"> / </span>Michigan research</nav>
    <header>
      <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">Michigan · statewide DIFS evidence</p>
      <h1 className="mt-2 text-3xl font-bold text-[#0A2540]">Michigan insurance licensing and regulatory evidence</h1>
      <p className="mt-3 max-w-3xl text-slate-700">The Michigan Department of Insurance and Financial Services (DIFS) verifies insurers, licensed agency businesses, individual producers and appointments through separate live locators. An insurer is a legal company; an agency is a producer business; an individual producer is a person. An appointment is a relationship with an insurer, not a license.</p>
    </header>

    <section aria-label="Evidence summary" className="mt-8 grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-slate-200 bg-white p-5"><strong className="text-3xl text-[#0A2540]">{f(decisions.rows.length)}</strong><p className="mt-1 text-sm">Explicitly insurance-labeled DIFS final-decision index entries, 2022–2026</p></div>
      <div className="rounded-xl border border-slate-200 bg-white p-5"><strong className="text-3xl text-[#0A2540]">{f(identifiers)}</strong><p className="mt-1 text-sm">Decision PDFs with an exact printed System ID or other credential identifier</p></div>
      <div className="rounded-xl border border-slate-200 bg-white p-5"><strong className="text-3xl text-[#0A2540]">{f(exams.rows.length)}</strong><p className="mt-1 text-sm">DIFS market-conduct exam index rows; latest listed report {latestExam}</p></div>
    </section>

    <section id="verify" className="mt-10"><h2 className="text-2xl font-semibold text-[#0A2540]">Verify the right kind of record</h2><p className="mt-2 text-sm text-slate-700">DIFS says locator information updates in real time and can serve as proof of licensure. This hub has no current bulk roster, so use the live locator for status, Michigan authority, company type, lines, or designated responsible producer details.</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4"><h3 className="font-semibold">Legal insurer or insurance entity</h3><p className="mt-1 text-sm">Verify company status and authority in Michigan. NAIC code identifies a legal insurer; it does not identify an agency.</p><p className="mt-2 text-sm">{official(DIFS_SOURCES.insurer, 'DIFS Insurance Entity Locator')}</p><p className="mt-1 text-xs text-slate-600">Bulk roster: NOT_ACQUIRED</p></div>
        <div className="rounded-xl border border-slate-200 p-4"><h3 className="font-semibold">Insurance agency</h3><p className="mt-1 text-sm">A business acting as a producer needs its own license. The agency locator can show its designated responsible licensed producer.</p><p className="mt-2 text-sm">{official(DIFS_SOURCES.agency, 'DIFS Insurance Agency Locator')}</p><p className="mt-1 text-xs text-slate-600">Bulk roster: NOT_ACQUIRED</p></div>
        <div className="rounded-xl border border-slate-200 p-4"><h3 className="font-semibold">Individual agent or producer</h3><p className="mt-1 text-sm">Verify a person’s credential independently. An NPN may identify an agency or a person; confirm the grain in the locator. It is not an NAIC company code.</p><p className="mt-2 text-sm">{official(DIFS_SOURCES.producer, 'DIFS Insurance Agent Locator')}</p><p className="mt-1 text-xs text-slate-600">Bulk roster: NOT_ACQUIRED</p></div>
        <div className="rounded-xl border border-slate-200 p-4"><h3 className="font-semibold">Producer appointments</h3><p className="mt-1 text-sm">Check the producer–insurer relationship separately from licensure. DIFS also regulates surplus lines, TPAs, risk retention groups, purchasing groups and premium finance companies as separate classes.</p><p className="mt-2 text-sm">{official(DIFS_SOURCES.appointedProducers, 'DIFS appointed-producer locator')} · {official(DIFS_SOURCES.appointments, 'Appointment guidance')}</p><p className="mt-1 text-xs text-slate-600">Appointment bulk: NOT_ACQUIRED</p></div>
      </div>
      <form action="/michigan" className="mt-4 flex max-w-xl gap-2"><label htmlFor="npn" className="sr-only">Exact agency or person NPN</label><input id="npn" name="npn" inputMode="numeric" defaultValue={npn} placeholder="Exact NPN (agency or person)" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2"/><button className="rounded-lg bg-[#0A2540] px-4 py-2 text-white">Check indexed orders</button></form>
      {npn && <p className="mt-2 text-sm text-slate-700">NPN {npn}: {exactActions.length ? `${exactActions.length} indexed decision(s) print this NPN.` : 'No decision in this bounded subset prints this NPN.'} Confirm current producer status in the DIFS locator.</p>}
    </section>

    <section id="decisions" className="mt-10"><h2 className="text-2xl font-semibold text-[#0A2540]">Final decisions and orders</h2><p className="mt-2 text-sm text-slate-700">The {f(decisions.indexCountAtRetrieval)}-entry DIFS index mixes insurance and financial-services matters. {f(decisions.rows.length)} entries dated 2022–2026 explicitly mention insurance or producer in their indexed title or action; this is a conservative insurance subset, not every insurance case or unique respondent. {f(identifiers)} PDFs print an exact identifier on page 1. No decision is attached to a business by name.</p>
      <div className="mt-4 grid grid-cols-5 gap-2">{years.map((year) => <div className="rounded-lg border border-slate-200 p-3 text-center" key={year}><strong className="text-xl">{decisions.rows.filter((r) => r.date.startsWith(year)).length}</strong><p className="text-xs">{year} index entries</p></div>)}</div>
      <form action="/michigan" className="mt-5 flex max-w-xl gap-2"><label htmlFor="system" className="sr-only">Exact Michigan System ID</label><input id="system" name="system" inputMode="numeric" defaultValue={system} placeholder="Exact Michigan System ID" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2"/><button className="rounded-lg bg-[#0A2540] px-4 py-2 text-white">Find decisions</button></form>
      {system && <div className="mt-4 rounded-xl border border-slate-200 p-4"><h3 className="font-semibold">System ID {system}</h3>{exactActions.length ? <ul className="mt-2 space-y-2 text-sm">{exactActions.map((r) => <li key={r.sourceDocument}>{r.decisionIssuedDate ?? r.date} · {r.actionAsIndexed} · {official(`${r.sourceDocument}#page=${r.identifierSourcePage ?? 1}`, `Case ${r.caseNumber ?? 'document'}`)}</li>)}</ul> : <p className="mt-2 text-sm">No matching decision in this conservative index. This does not establish a clean history or current licensure.</p>}</div>}
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><caption className="mb-2 text-left font-semibold">Recent PDF-confirmed agency/business-entity producer decisions</caption><thead><tr><th className="py-2">Issued</th><th>Respondent as indexed</th><th>Action as indexed</th><th>System ID</th><th>Source</th></tr></thead><tbody>{companyAgencyRows.map((r) => <tr className="border-t border-slate-200" key={r.sourceDocument}><td className="py-2 pr-2 whitespace-nowrap">{r.decisionIssuedDate ?? r.date}</td><td className="pr-2">{r.respondentAsIndexed}</td><td className="pr-2">{r.actionAsIndexed}</td><td className="pr-2">{r.systemId ?? '—'}</td><td>{official(r.sourceDocument, r.caseNumber ?? 'PDF')}</td></tr>)}</tbody></table></div>
      <p className="mt-3 text-sm">{official(DIFS_SOURCES.decisions, 'Search all DIFS Final Decisions')} for the authoritative document and any later changes.</p>
    </section>

    <section id="examinations" className="mt-10"><h2 className="text-2xl font-semibold text-[#0A2540]">Market-conduct examinations</h2><p className="mt-2 text-sm text-slate-700">DIFS publishes a {f(exams.rows.length)}-row company examination index with insurer name, NAIC company code, report date, exam type and disposition. Its latest listed report is dated {latestExam}; the index contains no 2022–2026 report. An exam is not itself a finding or a current authorization record. {audit.marketExamRowsWithExactNaicIdentity} report rows share an exact NAIC code with {audit.distinctExistingNaicIdentities} existing legal-insurer identities in this hub; those are held read-only matches, with no exam evidence attached to profiles.</p>
      <form action="/michigan" className="mt-4 flex max-w-xl gap-2"><label htmlFor="naic" className="sr-only">Exact five-digit NAIC company code</label><input id="naic" name="naic" inputMode="numeric" defaultValue={naic} placeholder="Exact five-digit NAIC company code" className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2"/><button className="rounded-lg bg-[#0A2540] px-4 py-2 text-white">Find exams</button></form>
      {naic && <div className="mt-4 rounded-xl border border-slate-200 p-4"><h3 className="font-semibold">NAIC {naic}</h3>{exactExams.length ? <ul className="mt-2 space-y-2 text-sm">{exactExams.map((r) => <li key={r.sourceDocument}>{r.reportDate} · {r.insurerAsIndexed} · {r.examType} · {official(r.sourceDocument, 'DIFS report')}</li>)}</ul> : <p className="mt-2 text-sm">No report in the published DIFS exam index for this exact code. No conclusion about current authority or conduct follows.</p>}</div>}
      <p className="mt-3 text-sm">{official(DIFS_SOURCES.marketExams, 'Official DIFS company examinations index')} · {official(DIFS_SOURCES.marketRegulation, 'Market Regulation scope')}</p>
    </section>

    <section id="complaints" className="mt-10"><h2 className="text-2xl font-semibold text-[#0A2540]">Complaints and other reports</h2><p className="mt-2 text-sm text-slate-700">DIFS accepts insurance complaints and publishes company complaint statistics and ratios. Provider-level complaint records and case outcomes were not acquired; an intake is not a finding. The DIFS reports page also provides selected financial-examination material, but no current insurer-wide financial-exam index was acquired.</p><p className="mt-3 text-sm">{official(DIFS_SOURCES.complaints, 'File an insurance complaint')} · {official(DIFS_SOURCES.complaintStatistics, 'Company complaint statistics and ratios')} · {official(DIFS_SOURCES.reports, 'DIFS reports')}</p></section>

    <section id="clocks" className="mt-10 border-t border-slate-200 pt-6"><h2 className="text-xl font-semibold text-[#0A2540]">Source clocks and limits</h2><p className="mt-2 text-sm text-slate-700">Final-decision index and PDFs retrieved {decisions.retrievedAt}; each row keeps its index date and, where printed, decision issued date. Market exam index retrieved {exams.retrievedAt}; report dates are historical. Page generated {generatedAt}. DIFS locator data is live and was not snapshotted. Financial-exam and complaint-outcome rows are NOT_ACQUIRED.</p><p className="mt-2 text-sm text-slate-700">Exact graph attachments: 0. Name-only attachments: 0. Net-new canonical organizations: 0. Graph writes: 0. No local insurance pages or claims expansion were created.</p><p className="mt-3 text-sm"><Link className="text-sky-700 underline" href="/ask?q=Michigan%20insurance%20agency">Ask about Michigan insurance evidence</Link> · {official(DIFS_SOURCES.locatorFaq, 'DIFS locator FAQ')}</p></section>
  </main>;
}
