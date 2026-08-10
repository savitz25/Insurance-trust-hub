import type { ReactNode } from 'react';
import { Building2, Calendar, Info, Layers } from 'lucide-react';
import type { LocalMarketplaceLandscape } from '@/lib/marketplace/plans-search';
import { cn } from '@/lib/utils';

type Props = {
  landscape: LocalMarketplaceLandscape | null;
  /** Compact strip for tools hub teasers */
  compact?: boolean;
  className?: string;
};

function money(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `$${Math.round(n).toLocaleString()}`;
}

function range(
  low: number | null | undefined,
  high: number | null | undefined
): string {
  if (low == null && high == null) return '—';
  if (low != null && high != null && low !== high) {
    return `${money(low)}–${money(high)}`;
  }
  return money(low ?? high);
}

/**
 * Reusable local Marketplace landscape snapshot for planner results.
 * Partial payloads: show whatever CMS returned; never invent Gold or missing spreads.
 */
export function MarketSnapshot({ landscape, compact, className }: Props) {
  if (!landscape?.ok || !landscape.usedLiveApi) {
    return null;
  }

  return (
    <section
      className={cn(
        'rounded-2xl border border-slate-200 bg-white shadow-sm',
        compact ? 'p-4' : 'p-4 md:p-5',
        className
      )}
      aria-label="Local Marketplace landscape snapshot"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0284C7]">
            Local Marketplace snapshot
          </p>
          <h3 className="mt-1 text-base font-semibold text-slate-900 md:text-lg">
            {landscape.locationLabel || 'Your area'}
          </h3>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-600">
          <Calendar className="h-3 w-3" aria-hidden />
          Plan year {landscape.planYear}
        </span>
      </div>

      <dl
        className={cn(
          'mt-4 grid gap-3',
          compact ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-4'
        )}
      >
        <SnapStat
          icon={<Layers className="h-3.5 w-3.5" aria-hidden />}
          label="Plans listed"
          value={String(landscape.planCount)}
        />
        <SnapStat
          icon={<Building2 className="h-3.5 w-3.5" aria-hidden />}
          label="Issuers"
          value={String(landscape.issuerCount)}
        />
        <SnapStat
          label="Premium range"
          value={range(landscape.premiumSpread.low, landscape.premiumSpread.high)}
          hint="/mo full premium"
        />
        <SnapStat
          label="Deductible range"
          value={
            landscape.deductibleSpread.low != null || landscape.deductibleSpread.high != null
              ? range(landscape.deductibleSpread.low, landscape.deductibleSpread.high)
              : 'Not listed'
          }
          hint={
            landscape.deductibleSpread.low != null ? 'individual when provided' : undefined
          }
        />
      </dl>

      {!compact && (
        <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-600">
          {landscape.bronze && (
            <MetalChip
              metal="Bronze"
              count={landscape.bronze.planCount}
              from={landscape.bronze.lowestPremiumMonthly}
            />
          )}
          {landscape.silver && (
            <MetalChip
              metal="Silver"
              count={landscape.silver.planCount}
              from={landscape.silver.lowestPremiumMonthly}
            />
          )}
          {landscape.gold ? (
            <MetalChip
              metal="Gold"
              count={landscape.gold.planCount}
              from={landscape.gold.lowestPremiumMonthly}
            />
          ) : (
            <span className="rounded-full border border-dashed border-slate-200 px-2.5 py-1 text-slate-500">
              Gold not listed in this response
            </span>
          )}
        </div>
      )}

      <p className="mt-4 flex items-start gap-2 text-xs leading-relaxed text-slate-500">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        <span>
          Based on CMS Marketplace API for your household inputs
          {landscape.retrievedAt
            ? ` · retrieved ${new Date(landscape.retrievedAt).toLocaleString('en-US', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}`
            : ''}
          . Educational landscape only — not an enrollment application; verify on HealthCare.gov.
        </span>
      </p>
    </section>
  );
}

function SnapStat({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 px-3 py-2.5">
      <dt className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-500">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900">{value}</dd>
      {hint ? <p className="text-[10px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

function MetalChip({
  metal,
  count,
  from,
}: {
  metal: string;
  count: number;
  from: number | null;
}) {
  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1">
      {metal}: {count} plan{count === 1 ? '' : 's'}
      {from != null ? ` · from ${money(from)}/mo` : ''}
    </span>
  );
}
