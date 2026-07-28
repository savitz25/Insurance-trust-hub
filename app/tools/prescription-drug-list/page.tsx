import type { Metadata } from 'next';
import Link from 'next/link';
import { Pill } from 'lucide-react';
import { buildMetadata } from '@/lib/seo/metadata';
import { PrescriptionDrugBasket } from '@/components/tools/prescription-drug-basket';
import { DisclaimerBanner } from '@/components/disclaimer-banner';

export const metadata: Metadata = buildMetadata({
  title: 'Prescription Drug List Builder — Organize Your Medications',
  description:
    'Build a simple, private list of your prescriptions with name, strength, and dosage. Email or print your list for doctor visits, insurance reviews, and personal records.',
  path: '/tools/prescription-drug-list',
});

export default function PrescriptionDrugListPage() {
  return (
    <>
      <div className="border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50/80 to-teal-50/30">
        <div className="container mx-auto max-w-3xl px-4 py-10 md:py-14">
          <p className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-teal-700">
            <Pill className="h-3.5 w-3.5" aria-hidden />
            Insurance Trust Hub · Free tool
          </p>
          <h1 className="text-balance text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Build Your Prescription Drug List
          </h1>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-relaxed text-slate-600 md:text-lg">
            Create a simple, organized list of your medications. Include the name, strength, and how
            you take each one. Save to My Insurance, email, or print when you are done.
          </p>
          <p className="mt-3 text-sm font-medium text-slate-700">
            Helpful for doctor visits, insurance reviews, and keeping your records organized.
          </p>
          <p className="mt-4 text-sm text-slate-500">
            <Link href="/tools" className="font-medium text-teal-700 hover:underline">
              All insurance tools
            </Link>
            {' · '}
            <Link href="/my-insurance" className="font-medium text-teal-700 hover:underline">
              Insurance HQ
            </Link>
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-8 md:py-12">
        <PrescriptionDrugBasket />
      </div>

      <DisclaimerBanner />
    </>
  );
}
