import type { TrustScoreBreakdown } from '@/lib/insurance/enrichment/trust-score';
import { cn } from '@/lib/utils';

type Props = {
  breakdown: TrustScoreBreakdown;
  className?: string;
};

/**
 * Compact Trust Score factor list including Government Standing (Phase 1 CMS).
 */
export function TrustScoreBreakdownPanel({ breakdown, className }: Props) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Trust Score breakdown
          </p>
          <p className="text-2xl font-bold tabular-nums text-slate-900">
            {breakdown.total}
            <span className="text-base font-normal text-slate-500">/100</span>
          </p>
        </div>
      </div>
      <ul className="space-y-2">
        {breakdown.factors.map((f) => (
          <li key={f.id} className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-900">{f.label}</p>
              <p
                className={cn(
                  'text-sm font-semibold tabular-nums',
                  f.points > 0 && 'text-[#0284C7]',
                  f.points < 0 && 'text-rose-700',
                  f.points === 0 && 'text-slate-600'
                )}
              >
                {f.points > 0 ? `+${f.points}` : f.points}
              </p>
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-slate-500">{f.detail}</p>
          </li>
        ))}
      </ul>
      <p className="text-[11px] leading-relaxed text-slate-500">
        Composite from public reviews, BBB standing, license verification, tenure, and Government
        Standing (CMS-related signals). Not influenced by paid placement. Missing CMS data is scored
        neutrally.
      </p>
    </div>
  );
}
