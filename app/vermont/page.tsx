import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo/metadata";
import { StateHubLinks } from "@/components/hubs/state-hub-links";

export const metadata: Metadata = buildMetadata({
  title: "Vermont insurance licensing and regulatory evidence",
  description:
    "Vermont DFR sources for distinct insurer, agency, producer, adjuster, surplus-lines, appointment, and enforcement records.",
  path: "/vermont",
});

const department = "https://dfr.vermont.gov/insurance";
const producer =
  "https://dfr.vermont.gov/insurance/producer-and-individual-licensing";
const companies =
  "https://dfr.vermont.gov/insurance/company-licensing/licensed-company-information";
const surplus = "https://legislature.vermont.gov/statutes/fullchapter/08/138";
const lookup = "https://nipr.com/licensing-center";
const official = (url: string, label: string) => (
  <a
    className="font-medium text-sky-700 underline underline-offset-2"
    href={url}
    rel="noopener noreferrer"
    target="_blank"
  >
    {label}
  </a>
);

export default function VermontInsurancePage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-10 text-slate-900">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">
          Vermont Department of Financial Regulation
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight">
          Vermont insurance licensing evidence
        </h1>
        <p className="mt-5 text-lg text-slate-700">
          Vermont DFR regulates insurance companies and licensees through
          separate populations. Public licensing portals were reviewed, but
          regulator pages returned HTTP 403 to this acquisition environment; no
          access control was bypassed.
        </p>
      </header>
      <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
        <h2 className="text-2xl font-semibold text-[#0A2540]">
          Current populations
        </h2>
        <p className="mt-2 text-sm text-slate-700">
          A public source path exists for lookup and lists, but date-stamped row
          files could not be acquired in this pass:{" "}
          <strong>
            NOT_ACQUIRED — public portal inaccessible from this environment
          </strong>
          . This is not zero.
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-6 text-sm text-slate-700">
          <li>
            Insurers and certificates of authority — separate company
            population; roster NOT_ACQUIRED.
          </li>
          <li>
            Agencies/business entities — separate from individual producers;
            roster NOT_ACQUIRED.
          </li>
          <li>
            Individual producers and adjusters — separate person and license
            classes; rosters NOT_ACQUIRED.
          </li>
          <li>
            Surplus-lines — separate statutory eligibility and license
            classifications; do not merge with admitted insurers.
          </li>
          <li>
            Appointments — insurer-to-producer relationships, not licensees;
            rows NOT_ACQUIRED.
          </li>
        </ul>
      </section>
      <section className="mt-8">
        <h2 className="text-2xl font-semibold text-[#0A2540]">
          Oversight records remain separate
        </h2>
        <p className="mt-2 text-sm text-slate-700">
          Examinations, enforcement orders, receivership actions, and complaints
          have distinct clocks and meanings. An examination is not automatically
          an enforcement finding; a complaint is not a violation. No adverse
          entity joins are made by name alone.
        </p>
      </section>
      <section className="mt-8 border-t border-slate-200 pt-6">
        <h2 className="text-xl font-semibold text-[#0A2540]">
          Sources and clocks
        </h2>
        <p className="mt-2 text-sm text-slate-700">
          Official sources checked October 14, 2026. DFR/NIPR lookup sources are
          live; no dated roster or report was acquired. Vermont law also governs
          surplus-lines classifications separately.
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-sm">
          <li>{official(department, "Vermont DFR Insurance Division")}</li>
          <li>{official(producer, "Producer and individual licensing")}</li>
          <li>{official(companies, "Licensed company information")}</li>
          <li>
            {official(surplus, "Vermont insurance statutes, Chapter 138")}
          </li>
          <li>{official(lookup, "NIPR licensing center")}</li>
        </ul>
        <StateHubLinks stateSlug="vermont" />
      </section>
    </main>
  );
}
