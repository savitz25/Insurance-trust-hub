import type { Metadata } from 'next';
import Link from 'next/link';
import snapshot from '@/lib/oklahoma-intelligence/ok-ins-001.json';
import { buildMetadata } from '@/lib/seo/metadata';
import { StateHubLinks } from '@/components/hubs/state-hub-links';

export const metadata: Metadata = buildMetadata({
  title: 'Oklahoma insurance evidence from the 2025 annual report',
  description:
    'Oklahoma Insurance Department 2025 annual report: 88 domestic insurers and 1,794 foreign insurers, kept separate. Resident producers are 23,166 and the printed total licensees figure is 342,456. Those are not one population. Bulk rosters were not acquired.',
  path: '/oklahoma',
});

const fmt = (n: number) => n.toLocaleString('en-US');
const money = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const official = (url: string, label: string) => (
  <a className="font-medium text-sky-700 underline underline-offset-2" href={url} rel="noopener noreferrer" target="_blank">
    {label}
  </a>
);

const report = snapshot.annualReport;
const companies = snapshot.companies;
const licensees = snapshot.licensees;
const complaints = snapshot.complaints;
const legal = snapshot.legal;
const collections = snapshot.collections;

export default function OklahomaInsurancePage() {
  return (
    <main className="th-shell mx-auto w-full max-w-[960px] px-4 py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <Link href="/" className="text-sky-700 underline">Home</Link>
        <span aria-hidden="true"> / </span>Oklahoma research
      </nav>
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">Oklahoma · Insurance Department evidence</p>
        <h1 className="mt-2 text-3xl font-bold text-[#0A2540]">Oklahoma insurance company counts and regulatory records</h1>
        <p className="mt-3 max-w-3xl text-slate-700">
          The Department&apos;s 2025 annual report prints insurer counts, licensee figures, complaint activity, and legal activity as separate records. This page does not add them together and does not rank insurers.
        </p>
      </header>

      <section aria-label="Oklahoma evidence summary" className="mt-8 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <strong className="text-3xl text-[#0A2540]">{fmt(companies.domesticInsurers)}</strong>
          <p className="mt-1 text-sm">Domestic insurers. Foreign insurers are a separate printed count and are not added to this figure.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <strong className="text-3xl text-[#0A2540]">{fmt(companies.foreignInsurers)}</strong>
          <p className="mt-1 text-sm">Foreign insurers, printed as out of state. This is not a domestic count and not a producer count.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-5">
          <strong className="text-lg text-[#0A2540]">NOT_ACQUIRED</strong>
          <p className="mt-1 text-sm">Named company rows, business entities, appointments, and a surplus-lines licensee roster were not acquired.</p>
        </div>
      </section>

      <section id="companies" className="mt-10">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Insurer counts</h2>
        <p className="mt-2 text-sm text-slate-700">
          The {official(report.source, report.title)} prints {fmt(companies.domesticInsurers)} domestic insurers and {fmt(companies.foreignInsurers)} foreign insurers. The report does not print a combined total, and this page does not create one. Premium volume is printed as ${snapshot.premium.printedBillions} billion. That figure is rounded market volume, not an exact dollar amount and not a company count. Named company rows were <strong>NOT_ACQUIRED</strong>. A separate licensed-company market-share PDF was not downloaded. Captive, examination, and receivership counts were <strong>NOT_ACQUIRED</strong>. Retrieved {report.retrievedAt}. SHA-256 {report.sha256}. {report.printedClock}
        </p>
      </section>

      <section id="licensees" className="mt-10">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Printed licensee figures</h2>
        <p className="mt-2 text-sm text-slate-700">
          Resident producers: {fmt(licensees.residentProducers)}. Resident adjusters: {fmt(licensees.residentAdjusters)}. The report also prints {fmt(licensees.totalLicenseesPrinted)} total licensees. Those two resident classes do not equal that total, and the report does not itemize the remainder. {fmt(licensees.totalLicenseesPrinted)} is not one insurance population. Business entities, nonresident producers, nonresident adjusters, and appointments were <strong>NOT_ACQUIRED</strong>. Continuing-education courses offered: {fmt(licensees.ceCoursesOffered)}. Courses approved: {fmt(licensees.ceCoursesApproved)}. A course is not a licensee. A person is not a company. An appointment is not a license.
        </p>
      </section>

      <section id="complaints" className="mt-10">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Complaints and external reviews</h2>
        <p className="mt-2 text-sm text-slate-700">
          Complaints: {fmt(complaints.complaints)}. Money recovered for complaints: {money(complaints.moneyRecoveredForComplaints)}. External reviews: {fmt(complaints.externalReviews)}. Money recovered for external reviews: {money(complaints.moneyRecoveredForExternalReviews)}. The report also prints {fmt(complaints.feedbackInquiries)} feedback inquiries. It does not say those inquiries are the same rows as the complaints. The line split is life and annuity {fmt(complaints.byLine.lifeAndAnnuity)}, commercial {fmt(complaints.byLine.commercial)}, miscellaneous {fmt(complaints.byLine.miscellaneous)}, accident and health {fmt(complaints.byLine.accidentAndHealth)}, homeowners {fmt(complaints.byLine.homeowners)}, and auto {fmt(complaints.byLine.auto)}. That split equals the printed complaint count. It is not a second complaint population. Provider-level rows were <strong>NOT_ACQUIRED</strong>. A complaint is not a finding.
        </p>
      </section>

      <section id="legal" className="mt-10">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Legal activity</h2>
        <p className="mt-2 text-sm text-slate-700">
          For FY25, the report says the Legal Division handled {fmt(legal.consumerAssistanceReferrals)} consumer-assistance referrals, which resulted in {fmt(legal.finesFromThoseReferrals)} fines totaling {money(legal.fineDollarsFromThoseReferrals)}. EAGLE mediation referrals: {fmt(legal.eagleMediationReferrals)}. EAGLE mediations facilitated: {fmt(legal.eagleMediations)}. Anti-fraud referrals: {fmt(legal.antiFraudReferrals)}, with {fmt(legal.antiFraudCensures)} censures, {fmt(legal.antiFraudOneYearProbations)} one-year license probation, {fmt(legal.antiFraudRevocations)} license revocation, {fmt(legal.antiFraudSixMonthSuspensions)} six-month license suspensions, and {fmt(legal.antiFraudFines)} fines totaling {money(legal.antiFraudFineDollars)}. Orders issued: {fmt(legal.ordersIssued)}. Hearings held: {fmt(legal.hearingsHeld)}. Fines collected: {money(legal.finesCollectedDollars)}. The report does not say the collected total includes the two referral fine amounts, so those figures stay separate. None of this is a licensee census. The order corpus itself was <strong>NOT_ACQUIRED</strong>. Exact canonical attachments {snapshot.exactCanonicalAttachments}. Name-only adverse joins {snapshot.nameOnlyAdverseJoins}.
        </p>
      </section>

      <section id="collections" className="mt-10">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Tax and fee collections</h2>
        <p className="mt-2 text-sm text-slate-700">
          Fiscal year 2025 surplus-lines tax revenue is {money(collections.surplusLinesTaxDollars)}. That is tax collection, not a surplus-lines licensee count. Licensing permits and fees are {money(collections.licensingPermitsAndFeesDollars)}. Those fees are not a licensee roster. A surplus-lines licensee roster was <strong>NOT_ACQUIRED</strong>.
        </p>
      </section>

      <section id="limits" className="mt-10">
        <h2 className="text-2xl font-semibold text-[#0A2540]">Limits</h2>
        <p className="mt-2 text-sm text-slate-600">
          Retrieved {report.retrievedAt}. Net-new canonical organizations {snapshot.newCanonicalOrganizations}. Graph writes {snapshot.graphWrites}. Oklahoma City, Tulsa, Norman, Edmond, Lawton, and Broken Arrow are geographic context. This page does not add a city route.
        </p>
      </section>
      <StateHubLinks stateSlug="oklahoma" />
    </main>
  );
}
