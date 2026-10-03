import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo/metadata';
import { MY_INSURANCE_PATH } from '@/lib/my-insurance/constants';

export const metadata: Metadata = buildMetadata({
  title: 'My TrustHub',
  description:
    'My TrustHub is the consumer account. My Insurance is the specialist workspace on Insurance Trust Hub.',
  path: '/my-trusthub',
  noIndex: true,
});

export default function MyTrustHubEntryPage() {
  return (
    <div className="border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50 to-[#E0F2FE]/30">
      <div className="container mx-auto max-w-3xl px-4 py-10 md:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0284C7]">
          Consumer account
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
          My TrustHub
        </h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
          My TrustHub is your consumer account. My Insurance is the specialist workspace for
          agency research, comparisons, and saved tools on this hub.
        </p>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-slate-600">
          Saves stay on this device. Sync to My TrustHub is off, so a Save here does not create
          an account record and does not start a watch.
        </p>
        <p className="mt-6">
          <Link
            href={MY_INSURANCE_PATH}
            className="inline-flex min-h-11 items-center rounded-full bg-[#0284C7] px-4 text-sm font-semibold text-white hover:bg-[#1E3A8A]"
          >
            Open My Insurance workspace
          </Link>
        </p>
      </div>
    </div>
  );
}
