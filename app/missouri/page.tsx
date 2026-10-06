import type { Metadata } from 'next';
import Link from 'next/link';
import snapshot from '@/lib/missouri-intelligence/mo-ins-001.json';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: 'Missouri insurance company license types',
  description: 'Missouri DCI active company directory observations by printed license type. Insurers, third-party administrators, purchasing groups, producers, adjusters, appointments and regulatory actions are separate.',
  path: '/missouri',
});

const fmt = (value: number) => value.toLocaleString('en-US');

export default function MissouriInsurancePage() {
  return (
    <main className="th-shell mx-auto w-full max-w-[960px] px-4 py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm"><Link href="/" className="text-sky-700 underline">Home</Link><span aria-hidden="true"> / </span>Missouri research</nav>
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">Missouri · Department of Commerce and Insurance</p>
        <h1 className="mt-2 text-3xl font-bold text-[#0A2540]">Missouri insurance company license types</h1>
        <p className="mt-3 max-w-3xl text-slate-700">The DCI company directory mixes insurers with other regulated businesses. Its active records are shown by the regulator&apos;s printed license type. They are not a combined insurer census or a rating of any company.</p>
      </header>

      <section aria-label="Directory scope" className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5"><strong className="text-3xl text-[#0A2540]">{fmt(snapshot.listObservations)}</strong><p className="mt-1 text-sm">Active list observations across 166 saved directory pages.</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-5"><strong className="text-3xl text-[#0A2540]">{fmt(snapshot.distinctDetailRecords)}</strong><p className="mt-1 text-sm">Distinct detail records and distinct printed license numbers. One detail URL appeared twice in the list.</p></div>
        <div className="rounded-xl border border-slate-200 bg-white p-5"><strong className="text-3xl text-[#0A2540]">{snapshot.licenseTypes.length}</strong><p className="mt-1 text-sm">Printed license types, including non-insurer classes. Type counts partition detail records; do not add them to the directory total.</p></div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Active company directory by license type</h2>
        <p className="mt-3 text-slate-700">Source: <a className="underline" href={snapshot.source}>DCI Find an Insurance Company</a>, Active status filter. Retrieved {snapshot.retrievedAt.slice(0, 10)} UTC. The directory does not publish one dataset-wide effective date, so source-as-of is UNKNOWN. A company detail page may need rechecking before a current licensing decision.</p>
        <div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="py-2 pr-3">Printed DCI license type</th><th className="py-2 text-right">Distinct detail records</th></tr></thead><tbody>{snapshot.licenseTypes.map((row) => <tr key={row.type} className="border-b"><td className="py-2 pr-3">{row.type}</td><td className="py-2 text-right tabular-nums">{fmt(row.records)}</td></tr>)}</tbody></table></div>
        <p className="mt-3 text-sm text-slate-600">For example, property and casualty, life and health, excess/surplus-lines company, reinsurer, third-party administrator, purchasing group and service-contract provider are distinct printed classes. “Excess/Surplus Lines” here is a company type, not a count of individual surplus-lines licensees.</p>
      </section>

      <section className="mt-10 space-y-3 text-slate-700">
        <h2 className="text-2xl font-semibold">Separate license and regulatory records</h2>
        <p><a className="underline" href={snapshot.separateSources.agentsAndAgencies}>DCI agent and agency search</a> is a different source. Agency, individual producer, adjuster, surplus-lines person and appointment rosters are NOT_ACQUIRED. An agency is not an insurer or an individual producer.</p>
        <p><a className="underline" href={snapshot.separateSources.agentEnforcement}>Agent and agency enforcement actions</a> and <a className="underline" href={snapshot.separateSources.marketRegulationActions}>market-regulation actions</a> are separate DCI records. Order details, examinations and receivership records are NOT_ACQUIRED. A complaint is not a finding; no complaint count or adverse name-only join is published here.</p>
        <p className="text-sm">Existing entity matches, net-new canonical entities and record-level evidence attachments: NOT_ACQUIRED. Graph writes and exact adverse attachments: {snapshot.graphWrites}. This page is a source-grounded research route, not a live license search.</p>
      </section>
    </main>
  );
}
