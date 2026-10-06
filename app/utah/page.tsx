import type { Metadata } from 'next';
import Link from 'next/link';
import snapshot from '@/lib/utah-intelligence/ut-ins-001.json';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: 'Utah Insurance License Evidence and Separate Regulatory Records',
  description:
    'Utah Insurance Department evidence: a 2024 licensed-insurer count and separate, clearly labeled gaps for agency, producer, adjuster, surplus-lines, appointment, examination, and enforcement records.',
  path: '/utah',
});

const fmt = (value: number) => value.toLocaleString('en-US');
const official = (url: string, label: string) => (
  <a className="font-medium text-sky-700 underline underline-offset-2" href={url} rel="noopener noreferrer" target="_blank">
    {label}
  </a>
);

export default function UtahInsurancePage() {
  return (
    <main className="th-shell mx-auto w-full max-w-[960px] px-4 py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <Link href="/" className="text-sky-700 underline">Home</Link>
        <span aria-hidden="true"> / </span>Utah research
      </nav>
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">Utah · Insurance Department evidence</p>
        <h1 className="mt-2 text-3xl font-bold text-[#0A2540]">Utah insurance licensing and regulatory evidence</h1>
        <p className="mt-3 max-w-3xl text-slate-700">
          Utah Insurance Department records cover different legal and operational populations. The published insurer statistic below is not a combined insurance census, and it does not count agencies, producers, adjusters, appointments, or enforcement outcomes.
        </p>
      </header>

      <section aria-label="Insurer evidence" className="mt-8 grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <strong className="text-3xl text-[#0A2540]">{fmt(snapshot.insurersLicensedAtYearEnd)}</strong>
          <p className="mt-1 text-sm">Commercial fraternal, life, health, and property-and-casualty insurers licensed with Utah at the end of 2024.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <strong className="text-3xl text-[#0A2540]">{fmt(snapshot.healthInsurersReportingBusiness)}</strong>
          <p className="mt-1 text-sm">A separate health-business subset reporting 2024 annual financial statements; it is not added to the licensed-insurer count.</p>
        </div>
      </section>

      <section className="mt-10 space-y-3 text-slate-700">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Insurer evidence and source clock</h2>
        <p>
          The Utah Insurance Department&apos;s <a className="font-medium text-sky-700 underline" href={snapshot.source} rel="noopener noreferrer" target="_blank">2025 Health Market Report</a> states that {fmt(snapshot.insurersLicensedAtYearEnd)} commercial insurers were licensed in Utah at the end of 2024. It separately reports {fmt(snapshot.healthInsurersReportingBusiness)} insurers with health business on their 2024 annual financial statements. Underlying sources are the NAIC Financial Database and Utah Accident &amp; Health Survey. The figures are aggregate observations, not named company rows: distinct acquired entity rows 0; matches to existing entities <strong>NOT_ACQUIRED</strong>; net-new canonical entities 0; evidence attachments 0; graph writes 0. The report file was retrieved 2026-10-06 UTC; SHA-256 {snapshot.sha256}.
        </p>
        <p>
          For current company or license verification, use the Department&apos;s {official(snapshot.links.licenseeSearch, 'Licensee Search')}. Its published list page says agents, agencies, and companies can be searched there; customized agency/company lists may be restricted to department licensees with an insurance-business purpose, and the Department says it cannot release individual-agent data through that list process. Those searchable records do not supply a statewide acquired roster here.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Separate populations and record status</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left"><th className="py-2 pr-3">Record population</th><th className="py-2">Utah evidence status</th></tr></thead>
            <tbody>
              <tr className="border-b"><td className="py-2 pr-3">Insurers</td><td className="py-2">1,466 reported licensed at 2024 year end; no company-level rows acquired</td></tr>
              <tr className="border-b"><td className="py-2 pr-3">Agencies / business entities</td><td className="py-2"><strong>NOT_ACQUIRED</strong></td></tr>
              <tr className="border-b"><td className="py-2 pr-3">Individual producers</td><td className="py-2"><strong>NOT_ACQUIRED</strong></td></tr>
              <tr className="border-b"><td className="py-2 pr-3">Adjusters</td><td className="py-2"><strong>NOT_ACQUIRED</strong>; Utah says it does not license staff adjusters</td></tr>
              <tr className="border-b"><td className="py-2 pr-3">Surplus-lines licenses / companies</td><td className="py-2"><strong>NOT_ACQUIRED</strong>; keep person and company classes separate</td></tr>
              <tr className="border-b"><td className="py-2 pr-3">Appointments</td><td className="py-2"><strong>NOT_ACQUIRED</strong>; an appointment is not a license</td></tr>
              <tr className="border-b"><td className="py-2 pr-3">Examinations</td><td className="py-2"><strong>NOT_ACQUIRED</strong>; company financial examinations are distinct records</td></tr>
              <tr className="border-b"><td className="py-2 pr-3">Enforcement orders</td><td className="py-2"><strong>NOT_ACQUIRED</strong>; no adverse name-only joins</td></tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-slate-600">Missing rosters are unknown, not zero. A complaint is not a finding of wrongdoing. This page does not rank companies or people.</p>
      </section>

      <section className="mt-10 space-y-3 text-slate-700">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Regulator lookup and record sources</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>{official(snapshot.links.licenseeSearch, 'Licensee Search')} — verify agent, agency, or company license status directly.</li>
          <li>{official(snapshot.links.licenseeList, 'List of Licensees')} — Utah&apos;s access rules and available published lists.</li>
          <li>{official(snapshot.links.companyLicensing, 'Company licensing and regulated organizations')} — insurer classes and separate reinsurer lists.</li>
          <li>{official(snapshot.links.surplusLines, 'Excess and surplus-lines information')} — a separate market and authority.</li>
          <li>{official(snapshot.links.examinations, 'Examinations and solvency')} — insurer financial examination records.</li>
          <li>{official(snapshot.links.administrativeActions, 'Administrative actions against licensees')} — order records; no complaint-as-guilt inference.</li>
        </ul>
      </section>
    </main>
  );
}
