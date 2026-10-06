import type { Metadata } from 'next';
import Link from 'next/link';
import snapshot from '@/lib/west-virginia-intelligence/wv-ins-001.json';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: 'West Virginia insurance company types',
  description:
    'West Virginia Offices of the Insurance Commissioner company-type table as of 09/11/2026. Classes stay separate. Producer, agency, adjuster, and appointment rosters were not acquired.',
  path: '/west-virginia',
});

const fmt = (value: number) => value.toLocaleString('en-US');
const official = (url: string, label: string) => (
  <a className="font-medium text-sky-700 underline underline-offset-2" href={url} rel="noopener noreferrer" target="_blank">
    {label}
  </a>
);

const countOf = (name: string) => {
  const row = snapshot.companyTypes.find((item) => item.name === name);
  if (!row) throw new Error(`Missing company type ${name}`);
  return row.count;
};

export default function WestVirginiaInsurancePage() {
  return (
    <main className="th-shell mx-auto w-full max-w-[960px] px-4 py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <Link href="/" className="text-sky-700 underline">Home</Link>
        <span aria-hidden="true"> / </span>West Virginia research
      </nav>
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">West Virginia · Offices of the Insurance Commissioner</p>
        <h1 className="mt-2 text-3xl font-bold text-[#0A2540]">West Virginia insurance company types</h1>
        <p className="mt-3 max-w-3xl text-slate-700">
          The {snapshot.tableClockLabel} prints separate company classes. This page does not add them, does not turn the narrative quick fact into a census, and does not rank insurers or people.
        </p>
      </header>

      <section aria-label="West Virginia insurance evidence" className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <strong className="text-3xl text-[#0A2540]">{fmt(snapshot.companyTypeRowCount)}</strong>
          <p className="mt-1 text-sm text-slate-600">Company-type rows on the table. A row is not one combined population.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <strong className="text-3xl text-[#0A2540]">{fmt(snapshot.captivePrinted)}</strong>
          <p className="mt-1 text-sm text-slate-600">Captive, as printed. A printed zero in that class is not a producer count.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <strong className="text-3xl text-[#0A2540]">Not combined</strong>
          <p className="mt-1 text-sm text-slate-600">No combined West Virginia insurance population is published. Graph writes: {snapshot.graphWrites}.</p>
        </div>
      </section>

      <section className="mt-8 max-w-3xl space-y-4 text-sm leading-relaxed text-slate-700">
        <h2 className="text-lg font-semibold text-[#0A2540]">What the table clock covers</h2>
        <p>
          The {official(snapshot.source, 'company-home page')} prints {snapshot.tableClockLabel}. Commissioner {snapshot.commissionerNamedOnPage} is named on that page. Retrieved {snapshot.retrievedAt}. HTTP date {snapshot.httpDate}. Last-Modified was {snapshot.lastModified}. File SHA-256 {snapshot.sha256}. Bytes {snapshot.bytes.toLocaleString('en-US')}.
        </p>
        <p>
          The same page says: “{snapshot.narrativeQuickFact}” That sentence is a narrative quick fact. It is not the sum of the company-type table, and this page does not publish a combined count.
        </p>

        <h2 className="text-lg font-semibold text-[#0A2540]">Company types stay in their rows</h2>
        <p>
          Property &amp; Casualty is {fmt(countOf('Property & Casualty'))}. Life is {fmt(countOf('Life'))}. Surplus Lines is {fmt(countOf('Surplus Lines'))}. Title is {fmt(countOf('Title'))}. Managing General Agent is {fmt(countOf('Managing General Agent'))}. Those rows are not added. The Surplus Lines row is a company type, not a surplus-lines agent roster. The Managing General Agent row is a company type, not an appointment roster.
        </p>
        <p>
          Third Party Administrator is three rows: Home State {fmt(countOf('Third Party Administrator (Home State)'))}, Non-Resident {fmt(countOf('Third Party Administrator (Non-Resident)'))}, and Registered {fmt(countOf('Third Party Administrator (Registered)'))}. Those rows are not added.
        </p>
        <table className="mt-3 w-full text-left text-sm">
          <caption className="mb-2 text-left font-semibold text-[#0A2540]">{snapshot.tableClockLabel}</caption>
          <tbody>
            {snapshot.companyTypes.map((row) => (
              <tr key={row.name} className="border-t border-slate-200">
                <td className="py-1 pr-3">{row.name}</td>
                <td className="py-1 text-right font-medium">{fmt(row.count)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <h2 className="text-lg font-semibold text-[#0A2540]">Other grains were not acquired</h2>
        <p>
          An individual producer roster was {snapshot.notAcquired.individualProducerRoster}. An agency roster was {snapshot.notAcquired.agencyRoster}. An adjuster roster was {snapshot.notAcquired.adjusterRoster}. A surplus-lines agent roster was {snapshot.notAcquired.surplusLinesAgentRoster}. An appointment roster was {snapshot.notAcquired.appointmentRoster}. An appointment is not a license. Licensee Lookup is a search, not a bulk census. Missing is not zero.
        </p>
        <p>
          Examination records were {snapshot.notAcquired.examinationRoster}. Enforcement orders were {snapshot.notAcquired.enforcementOrderRoster}. A receivership census was {snapshot.notAcquired.receivershipCensus}. Named receivership pages were not joined to company types. Complaint intake is not a finding. No name-only adverse join was made.
        </p>
        <p>
          Quarterly named lists as of 6/30/2026 were {snapshot.notAcquired.quarterlyNamedListsAsOf2026_06_30}. The domestic company list as of 02/25/2026 was {snapshot.notAcquired.domesticCompanyNamedListAsOf2026_02_25}. Those clocks are not this table.
        </p>
        <p>
          Charleston, Morgantown, and Huntington are geography only. No city page is published.
        </p>
      </section>
    </main>
  );
}
