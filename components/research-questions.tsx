import Link from 'next/link';
import { ArrowRight, HelpCircle, MapPinned, ShieldCheck } from 'lucide-react';
import {
  RESEARCH_QUESTIONS,
  type ResearchQuestionId,
} from '@/lib/product/research-ia';
import { INSURANCE_BRAND, INSURANCE_RADIUS, INSURANCE_SHADOW } from '@/lib/design/insurance-design-system';
import { cn } from '@/lib/utils';

const ICONS: Record<ResearchQuestionId, typeof HelpCircle> = {
  need: HelpCircle,
  options: MapPinned,
  verify: ShieldCheck,
};

type Props = {
  /** Compact for embedded sections; full for homepage */
  variant?: 'full' | 'compact';
  className?: string;
  /** Optional path prefix context for return navigation */
  linkFrom?: (href: string) => string;
};

/**
 * Phase 2 — three consumer research questions.
 * Shared by homepage and /tools.
 */
export function ResearchQuestions({
  variant = 'full',
  className,
  linkFrom = (h) => h,
}: Props) {
  const compact = variant === 'compact';

  return (
    <ul
      className={cn(
        'grid gap-4',
        compact ? 'md:grid-cols-3' : 'lg:grid-cols-3',
        className
      )}
      aria-label="Three research questions"
    >
      {RESEARCH_QUESTIONS.map((q) => {
        const Icon = ICONS[q.id];
        return (
          <li key={q.id}>
            <article
              className={cn(
                'flex h-full flex-col border bg-white p-5 sm:p-6',
                'transition-colors hover:border-[#0284C7]/40'
              )}
              style={{
                borderColor: INSURANCE_BRAND.border,
                borderRadius: INSURANCE_RADIUS.cardLg,
                boxShadow: INSURANCE_SHADOW.card,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: INSURANCE_BRAND.ice,
                    color: INSURANCE_BRAND.shield,
                  }}
                  aria-hidden
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span
                  className="text-xs font-bold tabular-nums tracking-wide"
                  style={{ color: INSURANCE_BRAND.shield, opacity: 0.7 }}
                >
                  {q.number}
                </span>
              </div>
              <h3
                className={cn(
                  'mt-4 font-semibold tracking-tight',
                  compact ? 'text-base' : 'text-lg'
                )}
                style={{ color: INSURANCE_BRAND.ink }}
              >
                {q.title}
              </h3>
              <p
                className="mt-2 flex-1 text-sm leading-relaxed"
                style={{ color: INSURANCE_BRAND.ink }}
              >
                {q.description}
              </p>
              <Link
                href={linkFrom(q.primary.href)}
                className="mt-4 inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7] focus-visible:ring-offset-2 rounded-sm"
                style={{ color: INSURANCE_BRAND.shield }}
              >
                {q.primary.label}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              {!compact ? (
                <ul className="mt-4 flex flex-wrap gap-2 border-t pt-4" style={{ borderColor: INSURANCE_BRAND.border }}>
                  {q.links.slice(0, 4).map((l) => (
                    <li key={l.href + l.label}>
                      <Link
                        href={
                          l.href.startsWith('http')
                            ? l.href
                            : linkFrom(l.href)
                        }
                        {...(l.href.startsWith('http')
                          ? { target: '_blank', rel: 'noopener noreferrer' }
                          : {})}
                        className="inline-flex min-h-9 items-center rounded-full border bg-[#F8FAFC] px-2.5 py-1 text-xs font-semibold transition-colors hover:border-[#0284C7]/40 hover:bg-[#E0F2FE]/50"
                        style={{
                          borderColor: INSURANCE_BRAND.border,
                          color: INSURANCE_BRAND.navy,
                        }}
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </article>
          </li>
        );
      })}
    </ul>
  );
}
