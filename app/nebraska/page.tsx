import type { Metadata } from 'next';
import Link from 'next/link';
import snapshot from '@/lib/nebraska-intelligence/ne-ins-001.json';
import { buildMetadata } from '@/lib/seo/metadata';
import { StateHubLinks } from '@/components/hubs/state-hub-links';

export const metadata: Metadata = buildMetadata({
  title: 'Nebraska Insurance License Evidence and Separate Regulatory Records',
  description:
    'NAIC 2025 key facts for calendar year 2024: 1,687 Nebraska domestic and licensed foreign insurers, with 155 domestic insurers inside that total. Agencies, producers, and captives stay separate.',
  path: '/nebraska',
});

const fmt = (value: number) => value.toLocaleString('en-US');
const money = (value: number) => `$${fmt(value)}`;

export default function NebraskaInsurancePage() {
  const p = snapshot.statementPremiumsUsd;
  return (
    <main className="th-shell mx-auto w-full max-w-[960px] px-4 py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <Link href="/" className="text-sky-700 underline">Home</Link>
        <span aria-hidden="true"> / </span>Nebraska research
      </nav>
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">Nebraska · Department of Insurance evidence</p>
        <h1 className="mt-2 text-3xl font-bold text-[#0A2540]">Nebraska insurance licensing and regulatory evidence</h1>
        <p className="mt-3 max-w-3xl text-slate-700">
          Nebraska Department of Insurance records cover different populations. The NAIC company counts below are not a combined insurance census. Companies, agencies, individual producers, adjusters, surplus-lines licensees, appointments, and administrative actions stay separate. Omaha and Lincoln are not published as local pages.
        </p>
      </header>

      <section aria-label="Insurer evidence" className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <strong className="text-3xl text-[#0A2540]">{fmt(snapshot.domesticAndLicensedForeignInsurers)}</strong>
          <p className="mt-1 text-sm">Domestic and licensed foreign insurers. Rank {snapshot.totalRank}. Captives are not included.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <strong className="text-3xl text-[#0A2540]">{fmt(snapshot.domesticInsurers)}</strong>
          <p className="mt-1 text-sm">Domestic insurers. Rank {snapshot.domesticRank}. These 155 are inside the 1,687 and are not added again.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <strong className="text-3xl text-[#0A2540]">{fmt(snapshot.captiveCompanies)}</strong>
          <p className="mt-1 text-sm">Captive insurance companies, printed separately. Not added to the 1,687.</p>
        </div>
      </section>

      <section className="mt-10 space-y-3 text-slate-700">
        <h2 className="text-2xl font-semibold text-[#0A2540]">NAIC key facts, calendar year 2024</h2>
        <p>
          The NAIC <a className="font-medium text-sky-700 underline" href={snapshot.source} rel="noopener noreferrer" target="_blank">2025 State Insurance Regulation key facts for Nebraska</a> is a title year of 2025 and a data year of calendar 2024. It prints {fmt(snapshot.domesticAndLicensedForeignInsurers)} total licensed domestic and foreign insurers and {fmt(snapshot.domesticInsurers)} domestic insurers. The source says captives are not included in that total. It separately prints {fmt(snapshot.captiveCompanies)} captive insurance companies, direct written premium {money(snapshot.captiveDirectWrittenPremiumUsd)}, and total captive premium {money(snapshot.captiveTotalPremiumUsd)}. The captive premium is not the statement-type premium total.
        </p>
        <p>
          Named company rows were not acquired. Distinct entity rows {snapshot.distinctEntityRows}. Graph writes {snapshot.graphWrites}. The SBS lookup is a search, not a bulk census acquired for this page. A paid report-generator mailing list was not acquired. HTTP Last-Modified {snapshot.httpLastModified}. Retrieved {snapshot.retrievedAt}. SHA-256 {snapshot.sha256}.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Premium by annual statement type</h2>
        <p className="mt-3 text-slate-700">These are premium dollars for calendar year 2024, not company counts. The four statement-type rows sum to the printed total.</p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left"><th className="py-2 pr-3">Statement type</th><th className="py-2">Premium written</th></tr></thead>
            <tbody>
              <tr className="border-b"><td className="py-2 pr-3">Health</td><td className="py-2">{money(p.health)}</td></tr>
              <tr className="border-b"><td className="py-2 pr-3">Life, accident, and health</td><td className="py-2">{money(p.lifeAccidentAndHealth)}</td></tr>
              <tr className="border-b"><td className="py-2 pr-3">Property and casualty</td><td className="py-2">{money(p.propertyAndCasualty)}</td></tr>
              <tr className="border-b"><td className="py-2 pr-3">Title</td><td className="py-2">{money(p.title)}</td></tr>
              <tr className="border-b"><td className="py-2 pr-3">Total Nebraska</td><td className="py-2">{money(p.total)}</td></tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-slate-600">A property and casualty line table later in the same report prints {money(snapshot.propertyCasualtyLineTableTotalUsd)}, one dollar higher than the statement-type property and casualty row. This page uses the statement-type row.</p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Separate populations and record status</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left"><th className="py-2 pr-3">Record population</th><th className="py-2">Nebraska evidence status</th></tr></thead>
            <tbody>
              <tr className="border-b"><td className="py-2 pr-3">Named insurers</td><td className="py-2">Counts only. Company rows NOT_ACQUIRED</td></tr>
              <tr className="border-b"><td className="py-2 pr-3">Agencies / business entities</td><td className="py-2"><strong>NOT_ACQUIRED</strong></td></tr>
              <tr className="border-b"><td className="py-2 pr-3">Individual producers</td><td className="py-2"><strong>NOT_ACQUIRED</strong>. Department employment of {snapshot.departmentEmployment} is staff, not producers</td></tr>
              <tr className="border-b"><td className="py-2 pr-3">Adjusters</td><td className="py-2"><strong>NOT_ACQUIRED</strong></td></tr>
              <tr className="border-b"><td className="py-2 pr-3">Surplus lines</td><td className="py-2"><strong>NOT_ACQUIRED</strong></td></tr>
              <tr className="border-b"><td className="py-2 pr-3">Appointments</td><td className="py-2"><strong>NOT_ACQUIRED</strong>. An appointment is not a license</td></tr>
              <tr className="border-b"><td className="py-2 pr-3">Administrative actions</td><td className="py-2"><strong>NOT_ACQUIRED</strong>. No name-only joins</td></tr>
              <tr className="border-b"><td className="py-2 pr-3">Department complaints / inquiries</td><td className="py-2">{fmt(snapshot.departmentComplaints)} complaints and {fmt(snapshot.departmentInquiries)} inquiries. A complaint is not a finding</td></tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-slate-600">Missing rosters are unknown, not zero. The captive direct-written-premium figure of $0 is printed by the source. This page does not rank companies or people.</p>
      </section>

      <section className="mt-10 space-y-2 text-slate-700">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Where to verify a current record</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li><a className="font-medium text-sky-700 underline" href={snapshot.sbsLookup}>SBS external lookup</a> — a search, not this page’s census.</li>
          <li><a className="font-medium text-sky-700 underline" href={snapshot.department}>Nebraska Department of Insurance</a> — the state regulator.</li>
          <li><a className="font-medium text-sky-700 underline" href={snapshot.source}>NAIC Nebraska key facts</a> — the 2024 count and premium source.</li>
        </ul>
      </section>
      <StateHubLinks stateSlug="nebraska" />
    </main>
  );
}
