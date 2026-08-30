import Link from 'next/link';
import { AskInsuranceResultView } from '@/components/ask-insurance-result';
import { executeInsuranceAsk } from '@/lib/insurance-ask/execute';
import { buildMetadata } from '@/lib/seo/metadata';

export const dynamic = 'force-dynamic';

const EXAMPLES = [
  'Show insurance agencies credentialed in Florida.',
  'Show Florida-credentialed agencies with Property and Casualty authority.',
  'How many agencies are credentialed in Florida?',
  'What is an NPN?',
  'What is the difference between an insurance agency and insurer?',
];

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const meta = buildMetadata({
    title: q?.trim() ? `Ask: ${q.trim().slice(0, 80)}` : 'Ask InsuranceTrustHub',
    description:
      'Structured insurance regulatory research. Agencies, producers, and legal insurers stay separate. Not a ranking or quote engine.',
    path: q?.trim() ? `/ask?q=${encodeURIComponent(q.trim())}` : '/ask',
    noIndex: true,
  });
  return { ...meta, robots: { index: false, follow: true } };
}

export default async function AskPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? '').trim();
  const page = Number(params.page ?? '1') || 1;
  const result = q ? await executeInsuranceAsk(q, page) : null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:py-14">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0284C7]">Ask InsuranceTrustHub</p>
      <h1 className="mt-3 text-3xl font-semibold text-[#0A2540] sm:text-4xl">
        Structured insurance research, not a recommendation engine.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-[#1E293B]">
        Ask interprets the question. Current regulatory extracts answer it. Agencies, producers, and legal insurers
        stay separate. A credential is not a service territory and not an appointment.
      </p>
      <form action="/ask" method="get" className="mt-8" role="search" aria-label="Ask InsuranceTrustHub">
        <label htmlFor="ask-q" className="sr-only">
          Research question
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="ask-q"
            name="q"
            defaultValue={q}
            placeholder="Show insurance agencies credentialed in Florida."
            className="min-h-12 flex-1 rounded-xl border border-[#E2E8F0] px-4 text-[#0A2540]"
          />
          <button type="submit" className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[#0A2540] px-5 font-semibold text-white">
            Ask
          </button>
        </div>
      </form>
      {result ? (
        <div className="mt-10">
          <AskInsuranceResultView result={result} />
        </div>
      ) : (
        <ul className="mt-8 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <li key={ex}>
              <Link
                href={`/ask?q=${encodeURIComponent(ex)}`}
                className="inline-flex min-h-11 items-center rounded-full border border-[#E2E8F0] px-3 text-sm text-[#0A2540]"
              >
                {ex}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
