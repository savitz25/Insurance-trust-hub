import type { Metadata } from 'next';
import Link from 'next/link';
import snapshot from '@/lib/new-mexico-intelligence/nm-ins-001.json';
import { buildMetadata } from '@/lib/seo/metadata';
import { StateHubLinks } from '@/components/hubs/state-hub-links';

export const metadata: Metadata = buildMetadata({
  title: 'New Mexico title-bureau limits and separate regulatory gaps',
  description:
    'New Mexico Office of Superintendent of Insurance: the Title Insurance Bureau present-tense statement of 68 licensed title insurance agents and 24 underwriters, kept separate. Other statewide rosters were not acquired.',
  path: '/new-mexico',
});

const fmt = (value: number) => value.toLocaleString('en-US');
const official = (url: string, label: string) => (
  <a className="font-medium text-sky-700 underline underline-offset-2" href={url} rel="noopener noreferrer" target="_blank">
    {label}
  </a>
);

const title = snapshot.titleBureau;
const reports = snapshot.statisticalReports;

export default function NewMexicoInsurancePage() {
  return (
    <main className="th-shell mx-auto w-full max-w-[960px] px-4 py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <Link href="/" className="text-sky-700 underline">Home</Link>
        <span aria-hidden="true"> / </span>New Mexico research
      </nav>
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">New Mexico · Office of Superintendent of Insurance</p>
        <h1 className="mt-2 text-3xl font-bold text-[#0A2540]">New Mexico title insurance bureau limits</h1>
        <p className="mt-3 max-w-3xl text-slate-700">
          The Title Insurance Bureau sentence and every other regulatory population stay separate. This page does not add the title-agent count to the underwriter count, does not publish a combined insurance population, and does not rank insurers or people.
        </p>
      </header>

      <section aria-label="Title bureau evidence" className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <strong className="text-3xl text-[#0A2540]">{fmt(title.licensedTitleInsuranceAgents)}</strong>
          <p className="mt-1 text-sm">Licensed title insurance agents in the bureau&apos;s present-tense statement. Underwriters are not added to this figure.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <strong className="text-3xl text-[#0A2540]">{fmt(title.underwriters)}</strong>
          <p className="mt-1 text-sm">Underwriters in that same sentence. This is not a title-agent count and not an insurer census.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <strong className="text-lg text-[#0A2540]">NOT_ACQUIRED</strong>
          <p className="mt-1 text-sm">Insurers, individual producers, adjusters, surplus-lines brokers, appointments, examinations, enforcement orders, and receivership.</p>
        </div>
      </section>

      <section className="mt-10 space-y-3 text-slate-700">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Title bureau statement and source clock</h2>
        <p>
          The sentence below is the Title Insurance Bureau&apos;s present-tense statement on the {official(snapshot.source, 'divisions page')}, retrieved 2026-10-06. The page did not print a separate as-of date on that sentence. This page does not invent another clock.
        </p>
        <p>The Title Insurance Bureau currently regulates (68) licensed title insurance agents and (24) underwriters in New Mexico.</p>
        <p>
          {fmt(title.licensedTitleInsuranceAgents)} and {fmt(title.underwriters)} stay separate. They are not added. Business entities and agencies beyond that sentence were <strong>NOT_ACQUIRED</strong>. The title-agent figure is not a statewide agency census and not an individual-producer census. Regulator: {snapshot.regulator}.
        </p>
      </section>

      <section className="mt-10 space-y-3 text-slate-700">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Statistical reports are a filing grain</h2>
        <p>
          The same divisions page says the bureau collects and analyzes annual title agent and underwriter statistical reports. Those reports are a filing grain, not the {fmt(title.licensedTitleInsuranceAgents)} and not the {fmt(title.underwriters)}. The {official(reports.index, 'statistical-reports index')} was saved and contains PDF links across years. This page does not count those PDF links and does not publish a report-file count as a licensee census.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Separate populations and record status</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left"><th className="py-2 pr-3">Record population</th><th className="py-2">New Mexico evidence status</th></tr></thead>
            <tbody>
              <tr className="border-b"><td className="py-2 pr-3">Licensed title insurance agents</td><td className="py-2">{fmt(title.licensedTitleInsuranceAgents)} in the bureau sentence; not added to underwriters</td></tr>
              <tr className="border-b"><td className="py-2 pr-3">Underwriters</td><td className="py-2">{fmt(title.underwriters)} in the bureau sentence; not added to title agents</td></tr>
              <tr className="border-b"><td className="py-2 pr-3">Title statistical reports</td><td className="py-2">Filing grain; not the title-agent figure and not the underwriter figure. PDF links were not counted.</td></tr>
              <tr className="border-b"><td className="py-2 pr-3">Insurers</td><td className="py-2"><strong>NOT_ACQUIRED</strong>. Domestic and foreign insurers are not split because no insurer report was acquired.</td></tr>
              <tr className="border-b"><td className="py-2 pr-3">Business entities / agencies beyond the title-bureau sentence</td><td className="py-2"><strong>NOT_ACQUIRED</strong></td></tr>
              <tr className="border-b"><td className="py-2 pr-3">Individual producers</td><td className="py-2"><strong>NOT_ACQUIRED</strong></td></tr>
              <tr className="border-b"><td className="py-2 pr-3">Adjusters</td><td className="py-2"><strong>NOT_ACQUIRED</strong></td></tr>
              <tr className="border-b"><td className="py-2 pr-3">Surplus-lines brokers</td><td className="py-2"><strong>NOT_ACQUIRED</strong></td></tr>
              <tr className="border-b"><td className="py-2 pr-3">Third-party administrators</td><td className="py-2"><strong>NOT_ACQUIRED</strong>. A blank TPA annual-report form is not a census.</td></tr>
              <tr className="border-b"><td className="py-2 pr-3">Appointments</td><td className="py-2"><strong>NOT_ACQUIRED</strong>. An appointment is not a license.</td></tr>
              <tr className="border-b"><td className="py-2 pr-3">Examinations</td><td className="py-2"><strong>NOT_ACQUIRED</strong>. One examination order is not an exam census. No single insurer is named as the exam population.</td></tr>
              <tr className="border-b"><td className="py-2 pr-3">Enforcement orders</td><td className="py-2"><strong>NOT_ACQUIRED</strong>. No name-only adverse joins.</td></tr>
              <tr className="border-b"><td className="py-2 pr-3">Receivership</td><td className="py-2"><strong>NOT_ACQUIRED</strong></td></tr>
              <tr className="border-b"><td className="py-2 pr-3">Complaints</td><td className="py-2"><strong>NOT_ACQUIRED</strong>. A complaint is not a finding.</td></tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-slate-600">Missing rosters are unknown, not zero. Albuquerque marketing copy is not a statewide population. This page does not rank companies or people.</p>
      </section>

      <section className="mt-10 space-y-3 text-slate-700">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Regulator lookup</h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>{official(snapshot.source, 'OSI divisions')} — Title Insurance Bureau statement. Retrieved 2026-10-06.</li>
          <li>{official(reports.index, 'Title statistical reports')} — filing grain. PDF links are not a licensee census.</li>
          <li>{official(snapshot.licenseVerification.url, 'License status verification')} — a search, not a bulk census.</li>
        </ul>
      </section>

      <section id="limits" className="mt-10">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Limits</h2>
        <p className="mt-2 text-sm text-slate-600">
          Retrieved 2026-10-06. Net-new entities {snapshot.netNewEntities}. Graph writes {snapshot.graphWrites}. Name-only adverse joins {snapshot.nameOnlyAdverseJoins}. Albuquerque and Santa Fe are geography only. This page does not add a city route.
        </p>
      </section>
      <StateHubLinks stateSlug="new-mexico" />
    </main>
  );
}
