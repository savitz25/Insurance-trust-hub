import type { Metadata } from 'next';
import Link from 'next/link';
import snapshot from '@/lib/mississippi-intelligence/ms-ins-001.json';
import { buildMetadata } from '@/lib/seo/metadata';
import { StateHubLinks } from '@/components/hubs/state-hub-links';

export const metadata: Metadata = buildMetadata({
  title: 'Mississippi licensed companies and producer entities',
  description:
    'MID licensed-company list of 2,129 rows, kept separate from the 10,645 Insurance Producer Entity rows saved on 13 Aug 2026. Individual producers, adjusters, and surplus lines were not acquired.',
  path: '/mississippi',
});

const fmt = (n: number) => n.toLocaleString('en-US');
const companies = snapshot.licensedCompanies;
const entities = snapshot.producerEntities;

export default function MississippiInsurancePage() {
  return (
    <main className="th-shell mx-auto w-full max-w-[960px] px-4 py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <Link href="/" className="text-sky-700 underline">Home</Link>
        <span aria-hidden="true"> / </span>Mississippi research
      </nav>
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">Mississippi · Insurance Department evidence</p>
        <h1 className="mt-2 text-3xl font-bold text-[#0A2540]">Mississippi licensed companies and producer entities</h1>
        <p className="mt-3 max-w-3xl text-slate-700">
          This page does not publish one Mississippi insurance population. A licensed company, an insurance producer entity, an individual producer, an adjuster, a surplus-lines licensee, an appointment, and an enforcement order stay separate. Fire Marshal licenses are not producer licenses. This page does not rank insurers.
        </p>
      </header>
      <section className="mt-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border p-5">
          <p className="text-sm text-slate-600">Licensed-company list rows</p>
          <p className="mt-2 text-2xl font-bold">{fmt(companies.rows)}</p>
          <p className="mt-2 text-sm">Retrieved {companies.retrievedAt}. Unique license numbers match the rows. The type column partitions this list. It is not a risk-bearing-insurer-only census.</p>
        </div>
        <div className="rounded-xl border p-5">
          <p className="text-sm text-slate-600">Insurance producer entities</p>
          <p className="mt-2 text-2xl font-bold">{fmt(entities.rows)}</p>
          <p className="mt-2 text-sm">Saved {entities.fileDate}. Business entities, not individual producers and not the company list. The file was not downloaded again.</p>
        </div>
        <div className="rounded-xl border p-5">
          <p className="text-sm text-slate-600">Individual producers</p>
          <p className="mt-2 text-2xl font-bold">NOT_ACQUIRED</p>
          <p className="mt-2 text-sm">Missing is not zero. Adjusters, surplus-lines licensees, and appointments are also not acquired.</p>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Licensed companies</h2>
        <p className="mt-3 text-slate-700">
          The official list is <a className="underline" href={companies.source}>Company Licensing Search</a>, list name “{companies.listName}”. {fmt(companies.rows)} rows and {fmt(companies.uniqueLicenseNumbers)} distinct license numbers. NAIC ID is blank on {fmt(companies.blankNaic)} rows. Nonempty NAIC values are {fmt(companies.nonemptyNaicRows)} cells and {fmt(companies.uniqueNonemptyNaic)} distinct numbers, so NAIC is not the company count. Home-office state Mississippi is {fmt(companies.homeOfficeMississippi)}. Mailing state Mississippi is {fmt(companies.mailingMississippi)}. Those are address columns on the same list, not a second census.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left"><th className="py-2 pr-3">Printed type</th><th>Rows</th></tr></thead>
            <tbody>
              {companies.types.map((row) => (
                <tr key={row.type} className="border-t"><td className="py-2 pr-3">{row.type}</td><td>{fmt(row.rows)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-slate-600">The types sum to the {fmt(companies.rows)} list rows. They are not added again. Third-party administrators, rate service organizations, auto clubs, a blood plan, and a stock permit are inside the list, so {fmt(companies.rows)} is not an authorized-insurer-only total. SHA-256 {companies.sha256}.</p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Insurance producer entities</h2>
        <p className="mt-3 text-slate-700">
          Phase 24 already stored the {entities.fileDate} active-list export at {entities.file}. This sprint recounted it and did not load it again. The file has no license-class column. The inventory records the class as {entities.recordedClass}. {fmt(entities.rows)} rows and {fmt(entities.uniqueAgencyIds)} distinct agency IDs. Mississippi mailing state is {fmt(entities.mailMississippi)}. One row has a blank mailing state. {fmt(entities.expirationBeforeFileDate)} rows print an expiration date before the file day. The department says only active licenses are included in the lists, so those dates are not an inactive census. {fmt(entities.expirationOnOrAfterFileDate)} rows print an expiration on or after the file day. SHA-256 {entities.sha256}. The database was not re-read.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold">Not acquired</h2>
        <p className="mt-3 text-slate-700">
          Individual producers, adjusters, surplus-lines licensees, and appointments are {snapshot.notAcquired.individualProducers}. Company Type, Authorized Lines, and Risk Purchasing Groups downloads returned an error on {companies.retrievedAt} and were {snapshot.notAcquired.companyTypeExport}. The licensed-company type column is not a substitute for those exports. Enforcement orders are {snapshot.enforcement.orders}. Exact canonical attachments {snapshot.enforcement.exactCanonicalAttachments}. Name-only adverse joins {snapshot.enforcement.nameOnlyAdverseJoins}. Fire Marshal licensing is {snapshot.notAcquired.fireMarshalLicenses}. Jackson, Gulfport, and Biloxi are geography only. This page publishes no city route. Graph writes {snapshot.graphWrites}.
        </p>
      </section>
      <StateHubLinks stateSlug="mississippi" />
    </main>
  );
}
