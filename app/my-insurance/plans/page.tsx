import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo/metadata';
import { PlansLibrary } from '@/components/my-insurance/plans-library';

export const metadata: Metadata = buildMetadata({
  title: 'Coverage plans - My Insurance',
  description:
    'Private library of guest-saved coverage research plans. Research only — not a public directory.',
  path: '/my-insurance/plans',
  noIndex: true,
});

export default function MyInsurancePlansPage() {
  return (
    <div className="border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50 to-[#E0F2FE]/30">
      <div className="container mx-auto max-w-3xl px-4 py-10 md:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0284C7]">
          My Insurance · Plans
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
          Coverage plans
        </h1>
        <p className="mt-3 max-w-2xl text-base text-slate-600">
          Keep multiple research plans (like My Move reports). Shortlist and tool snapshots attach to
          the active plan. Compare tray stays global on this device.
        </p>
        <p className="mt-2 text-sm text-slate-500">
          <Link href="/my-insurance" className="font-medium text-[#0284C7] hover:underline">
            Insurance HQ
          </Link>
          {' · '}
          <Link href="/my-insurance/setup" className="font-medium text-[#0284C7] hover:underline">
            Guided setup
          </Link>
          {' · '}
          <Link href="/my-insurance/report" className="font-medium text-[#0284C7] hover:underline">
            Report
          </Link>
        </p>

        <div className="mt-8">
          <PlansLibrary />
        </div>
      </div>
    </div>
  );
}
