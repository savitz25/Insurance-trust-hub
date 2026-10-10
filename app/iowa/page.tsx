import type { Metadata } from 'next';
import Link from 'next/link';
import snapshot from '@/data/iowa/ia-ins-001/insurer-snapshot.json';
import agencies from '@/data/iowa/ia-ins-001/agency-snapshot.json';
import { buildMetadata } from '@/lib/seo/metadata';
import { StateHubLinks } from '@/components/hubs/state-hub-links';

export const metadata: Metadata = buildMetadata({
  title: 'Iowa insurance company licenses',
  description: 'Iowa Insurance Division licensed-company records by printed license type, separate from producers, agencies, adjusters, appointments and enforcement.',
  path: '/iowa',
});

export default function IowaInsurancePage() {
  return <main className="th-shell mx-auto w-full max-w-[960px] px-4 py-8 sm:py-10">
    <nav aria-label="Breadcrumb" className="mb-4 text-sm"><Link href="/" className="text-sky-700 underline">Home</Link><span aria-hidden="true"> / </span>Iowa research</nav>
    <header>
      <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">Iowa · Insurance Division</p>
      <h1 className="mt-2 text-3xl font-bold text-[#0A2540]">Iowa insurance company licenses</h1>
      <p className="mt-3 max-w-3xl text-slate-700">The state&apos;s licensed-company export contains {snapshot.rawRows.toLocaleString('en-US')} rows and {snapshot.distinctIowaLicenseNumbers.toLocaleString('en-US')} distinct Iowa company license numbers. These are company records, not a count of producers, agencies, adjusters or appointments.</p>
    </header>
    <section className="mt-8 space-y-3 text-slate-700">
      <h2 className="text-2xl font-semibold">Licensed company classes</h2>
      <p>The <a className="underline" href={snapshot.catalog}>Iowa Insurance Division dataset</a> identifies each record by Iowa license number. {snapshot.distinctNonblankNaicNumbers.toLocaleString('en-US')} distinct nonblank NAIC numbers appear; {snapshot.rowsWithoutNaicNumber} records have no NAIC number. A company&apos;s Iowa domicile or mailing address is not its Iowa authority. The state&apos;s printed business-license types remain separate.</p>
      <div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="py-2 pr-3">Printed license type</th><th className="py-2 text-right">License rows</th></tr></thead><tbody>{snapshot.licenseTypes.map(row => <tr key={row.type} className="border-b"><td className="py-2 pr-3">{row.type}</td><td className="py-2 text-right tabular-nums">{row.rows.toLocaleString('en-US')}</td></tr>)}</tbody></table></div>
    </section>
    <section className="mt-10 space-y-3 text-slate-700">
      <h2 className="text-2xl font-semibold">Other records stay separate</h2>
      <p>The separate <a className="underline" href={agencies.catalog}>IID producer business-entity export</a> returned {agencies.rawRows.toLocaleString('en-US')} list observations on {agencies.retrievedAt.slice(0, 10)} UTC. Its fields contain no license number or NIPR identifier, so a distinct agency count and company-to-agency join are UNKNOWN. No names were deduplicated or linked by address. Retained ZIP SHA-256: {agencies.archiveSha256}.</p>
      <p>Producer and agency status is researched through the state&apos;s SBS license lookup. Individual producers, adjusters, surplus-lines individuals, appointments and examinations are separate grains and were not acquired as statewide populations here. An insurer license number cannot be used as a producer or agency identifier.</p>
      <p><a className="underline" href="https://iid.iowa.gov/legal-resources/legal-information/enforcement-orders-actions">IID enforcement orders</a> and <a className="underline" href="https://iid.iowa.gov/legal-resources/administrative-orders-actions">administrative actions</a> require case-level review. No adverse order was joined by name; complaints are not findings.</p>
      <p className="text-sm">Export retrieved {snapshot.retrievedAt.slice(0, 10)} UTC; dataset-wide record-effective date: UNKNOWN. Retained source ZIP SHA-256: {snapshot.archiveSha256}. Existing matches and net-new canonical entities: NOT_ACQUIRED. Graph writes and record-level evidence attachments from this publication: 0. Recheck the named entity before relying on current status.</p>
    </section>
    <StateHubLinks stateSlug="iowa" />
  </main>;
}
