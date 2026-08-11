import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

type HubInventoryPaginationProps = {
  /** Path without query, e.g. /hubs/florida/jacksonville */
  basePath: string;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  className?: string;
};

function pageHref(basePath: string, page: number): string {
  if (page <= 1) return basePath;
  return `${basePath}?page=${page}`;
}

/**
 * Explicit hub listing pagination — never silent-caps the market total.
 */
export function HubInventoryPagination({
  basePath,
  page,
  totalPages,
  total,
  pageSize,
  className,
}: HubInventoryPaginationProps) {
  if (totalPages <= 1 || total <= pageSize) return null;

  const prev = page > 1 ? page - 1 : null;
  const next = page < totalPages ? page + 1 : null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Verified listings pages"
      className={cn(
        'mt-8 flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <p className="text-sm text-muted-foreground">
        Showing {from.toLocaleString()}–{to.toLocaleString()} of{' '}
        {total.toLocaleString()} verified research listings
        <span className="text-muted-foreground/80">
          {' '}
          · page {page} of {totalPages}
        </span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {prev != null ? (
          <Link
            href={pageHref(basePath, prev)}
            className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
            rel="prev"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Previous
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm text-muted-foreground opacity-50">
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Previous
          </span>
        )}
        {next != null ? (
          <Link
            href={pageHref(basePath, next)}
            className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10"
            rel="next"
          >
            Next
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 text-sm text-muted-foreground opacity-50">
            Next
            <ChevronRight className="h-4 w-4" aria-hidden />
          </span>
        )}
      </div>
    </nav>
  );
}
