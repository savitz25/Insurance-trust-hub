import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo/metadata';
import { StateHubLinks } from '@/components/hubs/state-hub-links';
import summary from '@/data/maine-ins-001/summary.json';

export const metadata: Metadata = buildMetadata({
  title: 'Maine insurance license and regulatory evidence',
  description: 'Maine Bureau of Insurance producer license evidence with source dates and separate license populations.',
  path: '/maine',
});

const fmt = (n: number) => n.toLocaleString('en-US');
const source = 'https://www.maine.gov/pfr/insurance/sites/maine.gov.pfr.insurance/files/inline-files/active-nonres-producers.xlsx';
const lookup = 'https://www11.maine.gov/pfr/insurance/node/3';
const licensees = 'https://www1.maine.gov/pfr/insurance/licensees';
const actions = 'https://www.maine.gov/pfr/insurance/legal/administrative-actions/licensee-discipline-consent-agreements';
const official = (url: string, label: string) => <a className="font-medium text-sky-700 underline underline-offset-2" href={url} rel="noopener noreferrer" target="_blank">{label}</a>;

export default function MaineInsurancePage() {
  return <main className="th-shell mx-auto w-full max-w-[960px] px-4 py-8 sm:py-10">
    <nav aria-label="Breadcrumb" className="mb-4 text-sm"><Link href="/" className="text-sky-700 underline">Home</Link><span aria-hidden="true"> / </span>Maine research</nav>
    <header><p className="text-xs font-semibold uppercase tracking-wider text-sky-700">Maine · Bureau of Insurance evidence</p><h1 className="mt-2 text-3xl font-bold text-[#0A2540]">Maine insurance licensing and regulatory records</h1><p className="mt-3 max-w-3xl text-slate-700">The Maine Bureau of Insurance lookup covers licensed people and companies. Its quarterly active nonresident-producer spreadsheet supplies one dated person-license slice. Insurers, agencies, individual producer records, adjusters, surplus-lines authority, appointments, and orders are different source populations.</p></header>

    <section aria-label="Maine nonresident producer evidence" className="mt-8 grid gap-3 sm:grid-cols-3">
      <div className="rounded-xl border border-slate-200 bg-white p-5"><strong className="text-3xl text-[#0A2540]">{fmt(summary.license_rows)}</strong><p className="mt-1 text-sm">active nonresident producer license rows in the August 1, 2026 source</p></div>
      <div className="rounded-xl border border-slate-200 bg-white p-5"><strong className="text-3xl text-[#0A2540]">{fmt(summary.distinct_npn_identifiers)}</strong><p className="mt-1 text-sm">distinct NPN identifiers in that person-license slice</p></div>
      <div className="rounded-xl border border-slate-200 bg-white p-5"><strong className="text-3xl text-[#0A2540]">{fmt(summary.distinct_license_numbers)}</strong><p className="mt-1 text-sm">distinct Maine license numbers; not a count of all licensed producers</p></div>
    </section>

    <section id="producers" className="mt-10"><h2 className="text-2xl font-semibold text-[#0A2540]">Active nonresident producer licenses</h2><p className="mt-2 text-sm text-slate-700">The Bureau posts a complete active nonresident producer list quarterly. Its August 1, 2026 spreadsheet has {fmt(summary.license_rows)} license rows: 222,983 `PRODUCER NON-RESIDENT` and 2,821 `PRODUCER LIMITED NON-RESIDENT`. Those rows contain {fmt(summary.distinct_npn_identifiers)} distinct NPN identifiers and {fmt(summary.distinct_license_numbers)} distinct Maine license numbers. These are identifiers and license records, not businesses or insurer appointments. The source file contains contact details; this page reports only counts. {official(source, 'Download the Bureau spreadsheet')} · {official(lookup, 'Open the Bureau licensee lookup')}.</p></section>

    <section id="other-populations" className="mt-10"><h2 className="text-2xl font-semibold text-[#0A2540]">Other Maine insurance populations</h2><p className="mt-2 text-sm text-slate-700">The Bureau identifies separate license and regulated-entity classes including agencies and other business entities, resident producers, adjusters and adjusting firms, surplus-lines, and insurers. The Bureau also lists appointments and administrative actions separately. Their current source-native rows and counts are NOT_ACQUIRED. Use the Bureau&apos;s {official(licensees, 'licensee category index')} and {official(lookup, 'lookup')} for those distinct records. A producer appointment is an insurer-producer relationship, not another producer license. A complaint is not an order or violation.</p></section>

    <section id="enforcement" className="mt-10"><h2 className="text-2xl font-semibold text-[#0A2540]">Orders and enforcement</h2><p className="mt-2 text-sm text-slate-700">The Bureau publishes {official(actions, 'licensee discipline and consent agreements')}. Individual order documents and exact identifier-based attachment to licensed entities have not been acquired for this page. Adverse joins by name alone: 0.</p></section>

    <section id="clocks" className="mt-10 border-t border-slate-200 pt-6"><h2 className="text-xl font-semibold text-[#0A2540]">Source clock and limits</h2><p className="mt-2 text-sm text-slate-700">Producer spreadsheet: active nonresident list as of August 1, 2026; retrieved October 12, 2026. The Bureau states it issues this complete nonresident list quarterly in February, May, August, and November. The live lookup was not snapshotted. Its notice warns that some authority dates show an incorrect 1/1/1901 after a system conversion and that first issue date does not establish continuous licensure. No single statewide insurance as-of date is asserted.</p><p className="mt-2 text-sm text-slate-700">Maine resident producer list, agencies/business entities, adjusters and adjusting firms, surplus-lines, appointments, insurer classes, and a complete order corpus: NOT_ACQUIRED. Exact canonical entity matches: 0; evidence attachments: 0. This page is a sourced partial population, not a combined insurance census.</p></section>
    <StateHubLinks stateSlug="maine" />
  </main>;
}
