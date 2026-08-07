import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { buildMetadata } from '@/lib/seo/metadata';
import { CoverageReport } from '@/components/my-insurance/coverage-report';

export const metadata: Metadata = buildMetadata({
  title: 'Coverage research report — My Insurance',
  description:
    'Takeaway summary of your guest-saved coverage plan, shortlist, and tool snapshots. Research only — not an endorsement.',
  path: '/my-insurance/report',
});

export default function MyInsuranceReportPage() {
  return (
    <div className="border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50 to-white print:bg-white">
      <div className="container mx-auto max-w-2xl px-4 py-10 md:py-14 print:max-w-none print:px-0 print:py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0284C7] print:hidden">
          My Insurance · Report-ready
        </p>
        <p className="mt-2 text-sm print:hidden">
          <Link href="/my-insurance" className="font-medium text-[#0284C7] hover:underline">
            Back to My Insurance
          </Link>
          {' · '}
          <Link href="/my-insurance/plans" className="font-medium text-[#0284C7] hover:underline">
            All plans
          </Link>
        </p>
        <div className="mt-6">
          <Suspense
            fallback={
              <div className="animate-pulse rounded-2xl border bg-slate-50 p-10 text-center text-sm text-slate-500">
                Loading report...
              </div>
            }
          >
            <CoverageReport />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
