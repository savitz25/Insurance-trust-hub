import type { Metadata } from 'next';
import Link from 'next/link';
import snapshot from '@/lib/south-carolina-intelligence/sc-ins-001.json';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: 'South Carolina insurance company counts and Department of Insurance evidence',
  description:
    'NAIC 2024 South Carolina domestic and licensed-foreign insurer counts, separate captives, premium by statement type, and the April 2026 Department of Insurance company list by printed type.',
  path: '/south-carolina',
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
const lines = snapshot.propertyCasualtyLines;
const department = snapshot.department;
const doiList = snapshot.doiCompanyList;

export default function SouthCarolinaInsurancePage() {
  return (
    <main className="th-shell mx-auto w-full max-w-[960px] px-4 py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <Link href="/" className="text-sky-700 underline">Home</Link>
        <span aria-hidden="true"> / </span>South Carolina research
      </nav>
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">South Carolina · Department of Insurance evidence</p>
        <h1 className="mt-2 text-3xl font-bold text-[#0A2540]">South Carolina insurance company counts and regulatory records</h1>
        <p className="mt-3 max-w-3xl text-slate-700">
          This page does not publish one South Carolina insurer total. A domestic insurer, a licensed foreign insurer, a captive, a surplus-lines insurer, a purchasing group, a reinsurer, a producer, an agency, and an adjuster stay separate. This page does not rank insurers.
        </p>
      </header>

      <section aria-label="South Carolina evidence summary" className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <strong className="text-3xl text-[#0A2540]">{fmt(companies.domesticAndLicensedForeignInsurers)}</strong>
          <p className="mt-1 text-sm">Domestic and licensed foreign insurers for calendar year 2024. The table prints state rank {companies.licensedRank}. The {fmt(companies.domesticInsurers)} domestic insurers are inside this total.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <strong className="text-3xl text-[#0A2540]">{fmt(captives.count)}</strong>
          <p className="mt-1 text-sm">Captive insurance companies. The NAIC table says captives are not included in the licensed-insurer count.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <strong className="text-lg text-[#0A2540]">NOT_ACQUIRED</strong>
          <p className="mt-1 text-sm">Producer, agency, adjuster, appointment, and surplus-lines broker rosters are null. Company lookup remains search-only.</p>
        </div>
      </section>

      <section id="companies" className="mt-10">
        <h2 className="text-2xl font-semibold text-[#0A2540]">NAIC insurer counts</h2>
        <p className="mt-2 text-sm text-slate-700">
          The {official(facts.source, facts.title)} uses calendar-year {facts.dataYear} figures from the {facts.underlyingSource}. The publication is a 2025 edition. That title year is not the data year. Retrieved {facts.retrievedAt}. SHA-256 {facts.sha256}. The scorecard overview page prints REGULATOR USE ONLY. Domestic insurers: {fmt(companies.domesticInsurers)}, state rank {companies.domesticRank}. Domestic and licensed foreign insurers: {fmt(companies.domesticAndLicensedForeignInsurers)}, state rank {companies.licensedRank}. A foreign-only count is not printed. The domestic count is inside the combined count and is not added again. Captives are not included. These printed counts are not the April 2026 department list and not a producer census.
        </p>
      </section>

      <section id="captives" className="mt-10">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Captives</h2>
        <p className="mt-2 text-sm text-slate-700">
          Captive companies: {fmt(captives.count)}. Direct written premium {money(captives.directWrittenPremium)}. Total captive premium {money(captives.totalCaptivePremium)}. Those two premium figures are not the same number. Captives stay outside the {fmt(companies.domesticAndLicensedForeignInsurers)} licensed-insurer count.
        </p>
      </section>

      <section id="premium" className="mt-10">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Premium by statement type</h2>
        <p className="mt-2 text-sm text-slate-700">
          Premium written is not a company count. Health {money(premium.health)}. Life, accident, and health {money(premium.lifeAccidentAndHealth)}. Property and casualty {money(premium.propertyAndCasualty)}. Title {money(premium.title)}. The report prints a South Carolina statement total of {money(premium.printedTotal)}, state rank {premium.printedTotalRank}. The separate property-and-casualty line-of-business table prints {money(lines.printedTotal)}. That line total is not the statement property-and-casualty figure. The individual lines are not republished here.
        </p>
      </section>

      <section id="department" className="mt-10">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Department complaints, inquiries, and staff</h2>
        <p className="mt-2 text-sm text-slate-700">
          Complaints: {fmt(department.complaints)}, state rank {department.complaintRank}. Inquiries: {fmt(department.inquiries)}, state rank {department.inquiryRank}. Complaints are not findings, and inquiries are not complaints. Provider-level complaint rows and outcomes were NOT_ACQUIRED. Department employment is {fmt(department.employment)} staff, state rank {department.employmentRank}. Staff are not producers. Taxes {money(department.taxes)}. Revenue {money(department.revenue)}. Budget {money(department.budget)}. The 2024 cost of regulation is $0.40 per $1,000 of premium. The cost table does not print 2023, so that year is not zero.
        </p>
      </section>

      <section id="doi-list" className="mt-10">
        <h2 className="text-2xl font-semibold text-[#0A2540]">April 2026 department company list</h2>
        <p className="mt-2 text-sm text-slate-700">
          The {official(doiList.source, doiList.title)} is a different clock from the 2024 NAIC counts. PDF created 2026-04-23. SHA-256 {doiList.sha256}. The file mixes authorized insurers with surplus-lines insurers, risk purchasing groups, reinsurers, rating organizations, and reinsurance intermediaries. Those printed types are not added, and the file does not print one total. The counts below are parsed from the company-type column. Two wrapped Eligible Surplus Lines Insurer names were joined, and one Approved Assuming Reinsurer row had a split initial. Property is a printed type of its own and is not folded into Property &amp; Casualty. A mailing address in South Carolina is not the license count. Current company lookup uses {official(snapshot.links.companySearch, 'the Department company search')}, which is search-only.
        </p>
        <table className="mt-4 w-full text-left text-sm">
          <caption className="sr-only">Parsed company types in the April 2026 South Carolina list</caption>
          <thead>
            <tr className="border-b border-slate-200">
              <th className="py-2 pr-3 font-semibold">Printed company type</th>
              <th className="py-2 font-semibold">Parsed rows</th>
            </tr>
          </thead>
          <tbody>
            {doiList.parsedTypes.map((row) => (
              <tr key={row.type} className="border-b border-slate-100">
                <td className="py-2 pr-3">{row.type}</td>
                <td className="py-2">{fmt(row.rows)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section id="geography" className="mt-10">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Geography</h2>
        <p className="mt-2 text-sm text-slate-700">
          Charleston, Columbia, and Greenville are geography only. This research publishes no city insurance route.
        </p>
      </section>
    </main>
  );
}
