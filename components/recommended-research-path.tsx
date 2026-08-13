import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { RECOMMENDED_FIRST_PATH } from '@/lib/product/research-ia';

/**
 * Phase 18 — first-visit ordered path on /tools.
 */
export function RecommendedResearchPath({
  linkFrom = (h: string) => h,
}: {
  linkFrom?: (href: string) => string;
}) {
  return (
    <section
      aria-labelledby="recommended-path"
      className="rounded-2xl border border-[#0284C7]/30 bg-gradient-to-br from-[#E0F2FE]/70 to-white p-5 md:p-6"
    >
      <h2 id="recommended-path" className="text-lg font-semibold text-slate-900">
        Recommended path for first-time visitors
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Four steps. Educational estimates only — official enrollment stays on .gov pathways.
      </p>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {RECOMMENDED_FIRST_PATH.map((step) => (
          <li key={step.step} className="rounded-xl border border-slate-200 bg-white p-3">
            <p className="text-xs font-semibold tabular-nums text-[#0284C7]">Step {step.step}</p>
            <p className="mt-1 text-sm font-semibold text-slate-900">{step.label}</p>
            <Link
              href={linkFrom(step.href)}
              className="mt-2 inline-flex min-h-10 items-center gap-1 text-sm font-semibold text-[#0284C7] hover:underline"
            >
              {step.cta}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
