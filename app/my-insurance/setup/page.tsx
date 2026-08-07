import type { Metadata } from 'next';
import Link from 'next/link';
import { buildMetadata } from '@/lib/seo/metadata';
import { GuidedPlanSetup } from '@/components/my-insurance/guided-plan-setup';

export const metadata: Metadata = buildMetadata({
  title: 'Guided coverage plan setup — My Insurance',
  description:
    'Build a guest-saved coverage research plan: what you protect, where, and optional situation notes. Educational only — no quotes.',
  path: '/my-insurance/setup',
});

export default function MyInsuranceSetupPage() {
  return (
    <div className="border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50 to-[#E0F2FE]/30">
      <div className="container mx-auto max-w-2xl px-4 py-10 md:py-14">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0284C7]">
          My Insurance · Guided setup
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
          Build your coverage plan
        </h1>
        <p className="mt-3 text-base text-slate-600">
          A few steps to label what you&apos;re researching. Guest-saved on this device. Not a quote
          request.
        </p>
        <p className="mt-2 text-sm">
          <Link href="/my-insurance" className="font-medium text-[#0284C7] hover:underline">
            ← Back to My Insurance
          </Link>
        </p>
        <div className="mt-8">
          <GuidedPlanSetup />
        </div>
      </div>
    </div>
  );
}
