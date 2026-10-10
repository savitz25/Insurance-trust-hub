import type { Metadata } from 'next';
import Link from 'next/link';
import { PUBLISHED_STATE_COUNT, PUBLISHED_STATES } from '@/lib/home/published-states';
import { buildMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = buildMetadata({
  title: 'State insurance intelligence',
  description: `${PUBLISHED_STATE_COUNT} published InsuranceTrustHub state intelligence pages. Each page uses that state's own regulator sources. No rankings or Trust Score.`,
  path: '/states',
});

export default function StatesIndexPage() {
  return (
    <main className="th-shell mx-auto w-full max-w-6xl px-4 py-10 sm:py-14">
      <nav aria-label="Breadcrumb" className="mb-4 text-sm text-slate-600">
        <Link href="/" className="font-medium text-[#0284C7] underline underline-offset-2">
          Home
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-slate-800">States</span>
      </nav>
      <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">State intelligence</p>
      <h1 className="mt-2 text-3xl font-bold text-[#0A2540] sm:text-4xl">State insurance intelligence</h1>
      <p className="mt-3 max-w-3xl text-slate-700">
        {PUBLISHED_STATE_COUNT} published state pages. Each one is built from that state&apos;s own regulator
        sources. A state page is not a county census, and a county or metro hub is not a statewide roster.
      </p>
      <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {PUBLISHED_STATES.map((state) => (
          <li key={state.slug} className="rounded-xl border border-slate-200 p-4">
            <Link href={state.href} className="font-semibold text-[#0284C7] underline underline-offset-2">
              {state.name}
            </Link>
            <span className="ml-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              {state.abbreviation}
            </span>
          </li>
        ))}
      </ul>
    </main>
  );
}
