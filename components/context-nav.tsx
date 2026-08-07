import Link from 'next/link';
import { ArrowLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  resolveContextNav,
  type BackTarget,
  type ContextNavModel,
  type NavCrumb,
} from '@/lib/navigation/context-nav';

type Props = {
  /** Current pathname, e.g. /data/counties/miami-dade-fl */
  pathname: string;
  /** Optional ?from= internal path for smarter back */
  from?: string | null;
  /** Label for the current page crumb */
  currentLabel?: string;
  backOverride?: BackTarget;
  className?: string;
  /** Hide breadcrumb trail (back only) */
  backOnly?: boolean;
  /** Precomputed model — skips resolve */
  model?: ContextNavModel;
};

export function ContextNav({
  pathname,
  from,
  currentLabel,
  backOverride,
  className,
  backOnly = false,
  model: modelProp,
}: Props) {
  const model =
    modelProp ??
    resolveContextNav(pathname, { from, currentLabel, backOverride });

  return (
    <div className={cn('space-y-2.5', className)}>
      <BackLink back={model.back} />
      {!backOnly && model.crumbs.length > 0 ? <BreadcrumbTrail crumbs={model.crumbs} /> : null}
    </div>
  );
}

export function BackLink({
  back,
  className,
}: {
  back: BackTarget;
  className?: string;
}) {
  return (
    <Link
      href={back.href}
      className={cn(
        'group inline-flex min-h-[40px] items-center gap-1.5 rounded-lg text-sm font-medium text-[#0284C7]',
        'transition-colors hover:text-[#0A2540] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7] focus-visible:ring-offset-2',
        className
      )}
    >
      <ArrowLeft
        className="h-4 w-4 shrink-0 transition-transform group-hover:-translate-x-0.5"
        aria-hidden
      />
      <span className="sm:hidden">← {back.shortLabel}</span>
      <span className="hidden sm:inline">{back.label}</span>
    </Link>
  );
}

export function BreadcrumbTrail({
  crumbs,
  className,
}: {
  crumbs: NavCrumb[];
  className?: string;
}) {
  return (
    <nav aria-label="Breadcrumb" className={cn('text-sm text-slate-500', className)}>
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-1">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <li key={`${crumb.label}-${i}`} className="inline-flex items-center gap-1">
              {i > 0 ? (
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300" aria-hidden />
              ) : null}
              {crumb.href && !isLast ? (
                <Link href={crumb.href} className="hover:text-slate-800 hover:underline">
                  {crumb.label}
                </Link>
              ) : (
                <span
                  className={cn(isLast ? 'font-medium text-slate-700' : undefined)}
                  aria-current={isLast ? 'page' : undefined}
                >
                  {crumb.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Server-friendly wrapper that accepts Next.js searchParams.from
 */
export function PageContextNav({
  pathname,
  searchParams,
  currentLabel,
  className,
  backOnly,
}: {
  pathname: string;
  searchParams?: { from?: string | string[] } | Promise<{ from?: string | string[] }>;
  currentLabel?: string;
  className?: string;
  backOnly?: boolean;
}) {
  // Note: callers should await searchParams in async pages and pass from string
  const fromRaw =
    searchParams && !('then' in (searchParams as object))
      ? (searchParams as { from?: string | string[] }).from
      : undefined;
  const from = Array.isArray(fromRaw) ? fromRaw[0] : fromRaw;
  return (
    <ContextNav
      pathname={pathname}
      from={from}
      currentLabel={currentLabel}
      className={className}
      backOnly={backOnly}
    />
  );
}
