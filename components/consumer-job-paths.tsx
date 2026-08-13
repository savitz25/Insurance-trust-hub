import Link from 'next/link';
import { PRIMARY_CONSUMER_JOBS } from '@/lib/product/research-ia';
import { INSURANCE_BRAND } from '@/lib/design/insurance-design-system';

/**
 * Phase 18 — five primary consumer jobs. Used on the homepage hero.
 */
export function ConsumerJobPaths({ className }: { className?: string }) {
  return (
    <nav aria-label="Start with what you need" className={className}>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#0A2540]/70">
        What do you need to research?
      </p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {PRIMARY_CONSUMER_JOBS.map((job) => (
          <li key={job.id}>
            <Link
              href={job.href}
              className="flex min-h-11 flex-col rounded-xl border bg-white px-3 py-2.5 transition-colors hover:border-[#0284C7]/40 hover:bg-[#E0F2FE]/40"
              style={{ borderColor: INSURANCE_BRAND.border }}
            >
              <span className="text-sm font-semibold" style={{ color: INSURANCE_BRAND.ink }}>
                {job.label}
              </span>
              <span className="mt-0.5 text-xs leading-snug" style={{ color: INSURANCE_BRAND.ink }}>
                {job.detail}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
