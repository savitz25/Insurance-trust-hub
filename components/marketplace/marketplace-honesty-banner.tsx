import { ExternalLink, Info, ShieldAlert } from 'lucide-react';
import type { MarketplaceDataSource } from '@/lib/tools/apply-marketplace-landscape';

type Props = {
  marketplace: MarketplaceDataSource;
  className?: string;
};

/**
 * Required honesty layer for any API-powered planner result.
 */
export function MarketplaceHonestyBanner({ marketplace, className }: Props) {
  return (
    <div
      className={
        className ??
        'space-y-3 rounded-xl border border-slate-200 bg-slate-50/90 px-4 py-3 text-sm text-slate-700'
      }
    >
      <div className="flex items-start gap-2">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#0284C7]" aria-hidden />
        <div>
          <p className="font-medium text-slate-900">Educational research — not HealthCare.gov</p>
          <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-xs leading-relaxed text-slate-600">
            {marketplace.honesty.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      </div>

      {marketplace.usedLiveApi ? (
        <p className="flex items-start gap-2 text-xs text-slate-600">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            Estimated local Marketplace landscape
            {marketplace.planCount != null ? ` · ${marketplace.planCount} plans` : ''}
            {marketplace.issuerCount != null ? ` · ${marketplace.issuerCount} issuers` : ''}
            {marketplace.locationLabel ? ` · ${marketplace.locationLabel}` : ''}
            {marketplace.planYear != null ? ` · plan year ${marketplace.planYear}` : ''}.
            Premiums shown are educational ranges from CMS data for your household inputs — not an
            official award or enrollment offer.
          </span>
        </p>
      ) : (
        <p className="flex items-start gap-2 text-xs text-amber-900/90">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
          <span>
            {marketplace.fallbackNotice ||
              'Live Marketplace data unavailable. Showing educational state-adjusted baselines only.'}
          </span>
        </p>
      )}

      <p className="text-xs">
        <a
          href="https://www.healthcare.gov"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-[#0284C7] hover:underline"
        >
          Verify and enroll on HealthCare.gov
          <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
        <span className="text-slate-500"> — final eligibility and pricing only there (or your state marketplace).</span>
      </p>
    </div>
  );
}
