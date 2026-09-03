import Link from "next/link";
import {
  getPublishedBySlug,
  insurerProfilePath,
} from "@/lib/national/legal-insurer-pilot";

type Props = { searchParams: Promise<{ profile?: string }> };

export const metadata = {
  title: "Claim unavailable | InsuranceTrustHub",
  robots: { index: false, follow: false },
};

export default async function ClaimUnavailablePage({ searchParams }: Props) {
  const { profile } = await searchParams;
  const row = profile ? getPublishedBySlug(profile) : null;
  const returnPath = row ? insurerProfilePath(row.slug) : "/insurers";

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-600">
        Customer profile access
      </p>
      <h1 className="mt-3 text-3xl font-semibold text-slate-950">
        This profile can&apos;t be claimed right now.
      </h1>
      <p className="mt-4 text-base leading-7 text-slate-700">
        We could not confirm that this exact legal-insurer profile is currently
        eligible for the customer claim program. No profile access was created,
        and the official InsuranceTrustHub record is unchanged.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          className="rounded-md bg-slate-950 px-4 py-3 font-semibold text-white"
          href={returnPath}
        >
          Return to the insurer profile
        </Link>
        <Link
          className="rounded-md border border-slate-300 px-4 py-3 font-semibold text-slate-900"
          href="/insurers"
        >
          Find another legal insurer
        </Link>
      </div>
      <p className="mt-8 text-sm text-slate-700">
        Think this is incorrect?{" "}
        <a
          className="font-semibold underline"
          href="mailto:support@asktrusthub.com?subject=Insurance%20profile%20claim%20review"
        >
          Request a review
        </a>
        . Support can review the classification, but cannot bypass identity or
        publication requirements.
      </p>
    </main>
  );
}
