import type { Metadata } from "next";
import Link from "next/link";
import snapshot from "@/lib/kansas-ins-001.json";
import { buildMetadata } from "@/lib/seo/metadata";

export const metadata: Metadata = buildMetadata({
  title: "Kansas Insurance License Evidence and Separate Regulatory Records",
  description:
    "Kansas Department of Insurance 2024 annual-report license aggregates for agents and agencies, with insurer, producer, adjuster, appointment, and enforcement evidence kept separate.",
  path: "/kansas",
});

const fmt = (value: number) => value.toLocaleString("en-US");

export default function KansasInsurancePage() {
  return (
    <main className="th-shell mx-auto w-full max-w-[960px] px-4 py-8 sm:py-10">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm">
        <Link href="/" className="text-sky-700 underline">
          Home
        </Link>
        <span aria-hidden="true"> / </span>Kansas research
      </nav>
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">
          Kansas · Department of Insurance evidence
        </p>
        <h1 className="mt-2 text-3xl font-bold text-[#0A2540]">
          Kansas insurance licensing and regulatory evidence
        </h1>
        <p className="mt-3 max-w-3xl text-slate-700">
          Kansas Department of Insurance populations have different grains and
          clocks. The annual report prints separate agent and agency license
          aggregates. Insurers, agencies, individual producers, adjusters,
          surplus-lines licensees, appointments, examinations, and
          administrative actions are not combined into a statewide provider
          census.
        </p>
      </header>

      <section
        aria-label="Annual report license aggregates"
        className="mt-8 grid gap-3 sm:grid-cols-2"
      >
        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-[#0A2540]">
            Agent licenses
          </h2>
          <strong className="mt-2 block text-3xl text-[#0A2540]">
            {fmt(snapshot.agentLicenses)}
          </strong>
          <p className="mt-1 text-sm text-slate-700">
            2024 annual-report aggregate: {fmt(snapshot.residentAgentLicenses)}{" "}
            resident and {fmt(snapshot.nonresidentAgentLicenses)} nonresident.
          </p>
          <p className="mt-2 text-sm text-slate-600">
            This is the report’s license aggregate, not a downloaded row-level
            roster or a deduplicated count of distinct people.
          </p>
        </article>
        <article className="rounded-xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold text-[#0A2540]">
            Agency licenses
          </h2>
          <strong className="mt-2 block text-3xl text-[#0A2540]">
            {fmt(snapshot.agencyLicenses)}
          </strong>
          <p className="mt-1 text-sm text-slate-700">
            2024 annual-report aggregate: {fmt(snapshot.residentAgencyLicenses)}{" "}
            resident and {fmt(snapshot.nonresidentAgencyLicenses)} nonresident.
          </p>
          <p className="mt-2 text-sm text-slate-600">
            Agency business entities remain separate from agent licenses. These
            report totals are not added together.
          </p>
        </article>
      </section>

      <section className="mt-10 space-y-3 text-slate-700">
        <h2 className="text-2xl font-semibold text-[#0A2540]">
          Source clock and coverage
        </h2>
        <p>
          The Kansas Department of Insurance 2024 annual report was issued in
          January 2025 and reports calendar-year 2024 information. The KDOI’s
          July 29, 2026 annual-report notice says more than 237,000 agents were
          licensed for 2025, but it does not provide an exact count in the
          notice; this page therefore retains the exact, category-separated
          figures printed in the 2024 report.
        </p>
        <p>
          The reported totals are aggregates. No named rows were acquired, no
          entity records were attached, and no graph writes were made. Retrieved{" "}
          {snapshot.retrievedAt}. The report host returned access denied during
          automated retrieval, so no local report-byte hash is asserted.
        </p>
      </section>

      <section className="mt-10">
        <h2 className="text-2xl font-semibold text-[#0A2540]">
          Separate populations and evidence status
        </h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="py-2 pr-3">Record population</th>
                <th className="py-2">Kansas evidence status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="py-2 pr-3">Insurers</td>
                <td className="py-2">
                  Company lookup exists; insurer roster NOT_ACQUIRED.
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-3">Agencies / business entities</td>
                <td className="py-2">
                  2024 report aggregate above; current named roster
                  NOT_ACQUIRED.
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-3">
                  Individual producers and adjusters
                </td>
                <td className="py-2">
                  2024 report agent-license aggregate above; current
                  person-level rows and separate adjuster roster NOT_ACQUIRED.
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-3">Surplus-lines licensees</td>
                <td className="py-2">
                  NOT_ACQUIRED as a source-row population.
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-3">Appointments</td>
                <td className="py-2">
                  NOT_ACQUIRED. Appointment is a company-producer relationship,
                  not a producer or company count. KDOI says appointments remain
                  active until terminated or the producer becomes inactive;
                  annual renewal fee ended July 1, 2025.
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-3">
                  Examinations and administrative orders
                </td>
                <td className="py-2">
                  Official pages exist; a bounded order/examination evidence
                  corpus is NOT_ACQUIRED. No name-only adverse joins.
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-3">Complaints</td>
                <td className="py-2">
                  Department complaint reporting exists; complaint is not a
                  finding or violation.
                </td>
              </tr>
              <tr className="border-b">
                <td className="py-2 pr-3">Rate and form filings</td>
                <td className="py-2">
                  Separate filing access; filing activity is not a license
                  population.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-slate-600">
          Unknown populations are not zero. Aggregate license totals are not a
          current-row census, and agents and agencies are not combined.
        </p>
      </section>

      <section className="mt-10 space-y-2 text-slate-700">
        <h2 className="text-2xl font-semibold text-[#0A2540]">
          Regulator verification
        </h2>
        <ul className="list-disc space-y-2 pl-6">
          <li>
            <a
              className="font-medium text-sky-700 underline"
              href={snapshot.source}
              rel="noopener noreferrer"
              target="_blank"
            >
              KDOI 2024 annual report
            </a>{" "}
            — source for the separate agent and agency aggregates.
          </li>
          <li>
            <a
              className="font-medium text-sky-700 underline"
              href={snapshot.licensing}
              rel="noopener noreferrer"
              target="_blank"
            >
              KDOI licensing
            </a>{" "}
            and{" "}
            <a
              className="font-medium text-sky-700 underline"
              href={snapshot.agencyLicensing}
              rel="noopener noreferrer"
              target="_blank"
            >
              agency licensing
            </a>{" "}
            — current regulator pathways.
          </li>
          <li>
            <a
              className="font-medium text-sky-700 underline"
              href={snapshot.appointments}
              rel="noopener noreferrer"
              target="_blank"
            >
              Company appointments
            </a>{" "}
            — separate relationship record and renewal guidance.
          </li>
          <li>
            <a
              className="font-medium text-sky-700 underline"
              href={snapshot.companies}
              rel="noopener noreferrer"
              target="_blank"
            >
              Company lookup
            </a>
            ,{" "}
            <a
              className="font-medium text-sky-700 underline"
              href={snapshot.examinations}
              rel="noopener noreferrer"
              target="_blank"
            >
              financial examinations
            </a>
            , and{" "}
            <a
              className="font-medium text-sky-700 underline"
              href={snapshot.legal}
              rel="noopener noreferrer"
              target="_blank"
            >
              legal actions
            </a>{" "}
            — distinct verification paths.
          </li>
          <li>
            <a
              className="font-medium text-sky-700 underline"
              href={snapshot.rateForm}
              rel="noopener noreferrer"
              target="_blank"
            >
              Rate and form filings
            </a>{" "}
            and{" "}
            <a
              className="font-medium text-sky-700 underline"
              href={snapshot.complaints}
              rel="noopener noreferrer"
              target="_blank"
            >
              complaint reporting
            </a>{" "}
            — neither is a license census or a finding of misconduct.
          </li>
        </ul>
      </section>
    </main>
  );
}
