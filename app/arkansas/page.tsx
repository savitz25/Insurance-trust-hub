import type { Metadata } from 'next';
import Link from 'next/link';
import snapshot from '@/lib/arkansas-intelligence/ar-ins-001.json';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: 'Arkansas insurance company counts and Department evidence',
  description:
    'NAIC 2024 Arkansas domestic and licensed-foreign insurer counts, separate captives, premium by statement type, and complaint totals. Producer, agency, adjuster, title-agent, and appointment rosters were not acquired.',
  path: '/arkansas',
});

const fmt = (n: number) => n.toLocaleString('en-US');
const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const official = (url: string, label: string) => (
  <a className="font-medium text-sky-700 underline underline-offset-2" href={url} rel="noopener noreferrer" target="_blank">
    {label}
  </a>
);

const facts = snapshot.naicKeyFacts;
const companies = snapshot.companies;
const captives = snapshot.captives;
const premium = snapshot.premiumByStatement;
const department = snapshot.department;

export default function ArkansasInsurancePage() {
  return (
    <main className="th-shell mx-auto w-full max-w-[960px] px-4 py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <Link href="/" className="text-sky-700 underline">Home</Link>
        <span aria-hidden="true"> / </span>Arkansas research
      </nav>
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">Arkansas · Insurance Department evidence</p>
        <h1 className="mt-2 text-3xl font-bold text-[#0A2540]">Arkansas insurance company counts and regulatory records</h1>
        <p className="mt-3 max-w-3xl text-slate-700">
          The NAIC key-facts report prints Arkansas insurer counts for calendar year 2024. A domestic insurer, a licensed foreign insurer, a captive, a premium total, a producer, an agency, an adjuster, a title agent, and an appointment are different records. This page does not add them together and does not rank insurers.
        </p>
      </header>

      <section aria-label="Arkansas evidence summary" className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <strong className="text-3xl text-[#0A2540]">{fmt(companies.domesticAndLicensedForeignInsurers)}</strong>
          <p className="mt-1 text-sm">Domestic and licensed foreign insurers. Captives are excluded. The {fmt(companies.domesticInsurers)} domestic insurers are inside this total, not added to it.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <strong className="text-3xl text-[#0A2540]">{fmt(captives.count)}</strong>
          <p className="mt-1 text-sm">Captive insurance companies. Kept outside the licensed-insurer count.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <strong className="text-lg text-[#0A2540]">NOT_ACQUIRED</strong>
          <p className="mt-1 text-sm">Company, agency, producer, adjuster, title-agent, surplus-lines, and appointment rosters are null. Licensee lookup remains search-only.</p>
        </div>
      </section>

      <section id="companies" className="mt-10">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Insurer counts</h2>
        <p className="mt-2 text-sm text-slate-700">
          The {official(facts.source, facts.title)} uses calendar-year {facts.dataYear} figures from the {facts.underlyingSource}. The publication title is a {facts.publicationYear} edition. That title year is not the data year. File last-modified {facts.httpLastModified}. Retrieved {facts.retrievedAt}. SHA-256 {facts.sha256}. Domestic insurers: {fmt(companies.domesticInsurers)}. Domestic and licensed foreign insurers: {fmt(companies.domesticAndLicensedForeignInsurers)}. Captives are not included. Named company rows and NAIC codes were <strong>NOT_ACQUIRED</strong>. The printed counts are not a loaded roster and not a producer census. The {official(snapshot.links.licensing, 'Arkansas Insurance Department licensing page')} points to NIPR and the NAIC State-Based Systems search. That search is not a bulk roster.
        </p>
      </section>

      <section id="captives" className="mt-10">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Captives</h2>
        <p className="mt-2 text-sm text-slate-700">
          Captive companies: {fmt(captives.count)}. Direct written premium {money(captives.directWrittenPremium)}. Total captive premium {money(captives.totalCaptivePremium)}. These figures stay outside the {fmt(companies.domesticAndLicensedForeignInsurers)} licensed-insurer count. Captive rows were not acquired.
        </p>
      </section>

      <section id="premium" className="mt-10">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Premium by statement type</h2>
        <p className="mt-2 text-sm text-slate-700">
          Premium written is not a company count and not a license count. Health {money(premium.health)}. Life, accident, and health {money(premium.lifeAccidentAndHealth)}. Property and casualty {money(premium.propertyAndCasualty)}. Title {money(premium.title)}. The report prints an Arkansas total of {money(premium.printedTotal)}. That total is the sum of those statement types. It is not added to the insurer counts. The property-and-casualty line-of-business table prints {money(premium.propertyCasualtyLineOfBusinessPrintedTotal)}. That figure does not replace the statement-type row. Title premium is not a title-agent roster.
        </p>
      </section>

      <section id="department" className="mt-10">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Department complaints, inquiries, and staff</h2>
        <p className="mt-2 text-sm text-slate-700">
          The same NAIC report prints Arkansas Insurance Department complaints: {fmt(department.complaints)}. Inquiries: {fmt(department.inquiries)}. Department employment: {fmt(department.employment)}. Complaints and inquiries are separate. Provider-level complaint rows and outcomes were <strong>NOT_ACQUIRED</strong>. A complaint total is not an enforcement finding. Department employment is staff, not a producer, agency, or adjuster license count.
        </p>
      </section>

      <section id="rosters" className="mt-10">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Licensee rosters</h2>
        <p className="mt-2 text-sm text-slate-700">
          Individual producers, agencies and business entities, adjusters, title agents, surplus-lines licensees, and appointments were <strong>NOT_ACQUIRED</strong>. Missing rosters are not zero. An appointment is not a license. An agency is not an insurer. A person is not a company. Enforcement orders and discipline records were <strong>NOT_ACQUIRED</strong>. Exact canonical attachments {snapshot.enforcement.exactCanonicalAttachments}. Name-only adverse joins {snapshot.enforcement.nameOnlyAdverseJoins}.
        </p>
      </section>

      <section id="limits" className="mt-10">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Limits</h2>
        <p className="mt-2 text-sm text-slate-600">
          Data year {facts.dataYear}. Retrieved {facts.retrievedAt}. Net-new canonical organizations {snapshot.newCanonicalOrganizations}. Graph writes {snapshot.graphWrites}. Little Rock, Fayetteville, and Fort Smith are geographic context. This page does not add a city route.
        </p>
      </section>
    </main>
  );
}
