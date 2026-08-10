import { ExternalLink, Shield } from 'lucide-react';
import type {
  LocalMarketplaceLandscape,
  ResearchPathCard,
} from '@/lib/marketplace/plans-search';
import { cn } from '@/lib/utils';

type Props = {
  landscape: LocalMarketplaceLandscape | null;
  /** Which path aligns with cost-planner recommendation when present */
  highlightPathId?: 'lowest' | 'balanced' | 'higher_protection' | null;
  /** Map planner metal recommendation → research path highlight */
  recommendedMetal?: 'bronze' | 'silver' | 'gold' | null;
  className?: string;
};

function money(n: number | null | undefined, per?: 'mo'): string {
  if (n == null || !Number.isFinite(n)) return '—';
  return `$${Math.round(n).toLocaleString()}${per === 'mo' ? '/mo' : ''}`;
}

function metalToPath(m: 'bronze' | 'silver' | 'gold' | null | undefined): ResearchPathCard['id'] | null {
  if (m === 'bronze') return 'lowest';
  if (m === 'silver') return 'balanced';
  if (m === 'gold') return 'higher_protection';
  return null;
}

/**
 * Three research paths from live CMS landscape.
 * Educational examples only — not a ranked quote list or enrollment flow.
 */
export function ResearchPathCards({
  landscape,
  highlightPathId,
  recommendedMetal,
  className,
}: Props) {
  if (!landscape?.ok || !landscape.researchPaths?.length) return null;

  const highlight =
    highlightPathId ?? metalToPath(recommendedMetal) ?? null;

  return (
    <section className={cn('space-y-3', className)} aria-label="Local research path examples">
      <div>
        <h3 className="text-lg font-semibold text-slate-900">Three local research paths</h3>
        <p className="mt-1 text-sm text-slate-500">
          Deterministic examples from CMS plan search for your ZIP and household — not a full plan
          browser and not official quotes.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {landscape.researchPaths.map((path) => (
          <PathCard
            key={path.id}
            path={path}
            highlighted={highlight === path.id}
          />
        ))}
      </div>
      <p className="text-xs text-slate-500">
        Educational examples — verify plan names, networks, and prices on HealthCare.gov before
        enrolling.
      </p>
    </section>
  );
}

function PathCard({
  path,
  highlighted,
}: {
  path: ResearchPathCard;
  highlighted: boolean;
}) {
  const premium =
    path.premiumAfterCreditMonthly != null
      ? money(path.premiumAfterCreditMonthly, 'mo')
      : money(path.premiumMonthly, 'mo');
  const premiumNote =
    path.premiumAfterCreditMonthly != null
      ? 'Est. after educational credit context'
      : 'Full premium (before official credits)';

  return (
    <article
      className={cn(
        'flex flex-col rounded-xl border p-4',
        highlighted
          ? 'border-[#0284C7]/50 bg-[#E0F2FE]/40 ring-1 ring-[#E0F2FE]'
          : 'border-slate-200 bg-white',
        !path.available && 'opacity-80'
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-semibold text-slate-900">{path.label}</p>
          {path.metal ? (
            <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-[#0284C7]">
              {path.metal}-style metal
              {path.planCountInMetal > 0
                ? ` · ${path.planCountInMetal} in tier`
                : ''}
            </p>
          ) : (
            <p className="mt-0.5 text-xs text-slate-500">Metal example unavailable</p>
          )}
        </div>
        {highlighted && (
          <span className="rounded-full bg-[#0284C7] px-2 py-0.5 text-[10px] font-semibold text-white">
            Fits your inputs
          </span>
        )}
      </div>

      <dl className="mt-3 space-y-2 text-sm">
        <div>
          <dt className="text-xs text-slate-500">{premiumNote}</dt>
          <dd className="text-lg font-semibold tabular-nums text-slate-900">{premium}</dd>
        </div>
        {(path.deductible != null || path.moop != null) && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <dt className="text-slate-500">Deductible</dt>
              <dd className="font-medium text-slate-800">{money(path.deductible)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Max OOP</dt>
              <dd className="font-medium text-slate-800">{money(path.moop)}</dd>
            </div>
          </div>
        )}
      </dl>

      {(path.planName || path.issuerName) && (
        <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50/80 px-2.5 py-2 text-xs text-slate-700">
          {path.issuerName ? (
            <p className="font-medium text-slate-900">{path.issuerName}</p>
          ) : null}
          {path.planName ? <p className="mt-0.5 text-slate-600">{path.planName}</p> : null}
          <p className="mt-1 text-[10px] text-slate-500">
            Educational example from CMS response — not a recommendation to enroll.
          </p>
        </div>
      )}

      <p className="mt-3 flex-1 text-[11px] leading-relaxed text-slate-500">{path.heuristicNote}</p>

      <p className="mt-3 inline-flex items-center gap-1 text-[11px] font-medium text-[#0284C7]">
        <Shield className="h-3 w-3" aria-hidden />
        Educational example — verify on HealthCare.gov
      </p>
    </article>
  );
}

/** Consumer-facing Q&A narrative from landscape.narrative */
export function LandscapeNarrative({
  landscape,
  className,
}: {
  landscape: LocalMarketplaceLandscape | null;
  className?: string;
}) {
  if (!landscape?.ok || !landscape.narrative) return null;
  const n = landscape.narrative;
  const items = [
    { q: 'How many Marketplace plans are available around this ZIP?', a: n.howManyPlans },
    { q: 'What does a lower-premium option look like locally?', a: n.lowerPremium },
    { q: 'What does a more protective option look like locally?', a: n.moreProtective },
    { q: 'What does assistance likely change in this market?', a: n.assistance },
  ];

  return (
    <section
      className={cn(
        'rounded-2xl border border-slate-200 bg-slate-50/80 p-4 md:p-5',
        className
      )}
    >
      <h3 className="text-base font-semibold text-slate-900">What this local market means</h3>
      <ul className="mt-3 space-y-3">
        {items.map((item) => (
          <li key={item.q}>
            <p className="text-sm font-medium text-slate-800">{item.q}</p>
            <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{item.a}</p>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs">
        <a
          href="https://www.healthcare.gov"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 font-medium text-[#0284C7] hover:underline"
        >
          Compare official options on HealthCare.gov
          <ExternalLink className="h-3 w-3" aria-hidden />
        </a>
      </p>
    </section>
  );
}
