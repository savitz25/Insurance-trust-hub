import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildDirectoryHref } from '@/lib/directory/params';

type DirectoryPaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  searchParams: Record<string, string>;
  className?: string;
};

function pageWindow(page: number, totalPages: number): Array<number | 'ellipsis'> {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const set = new Set<number>([1, totalPages, page - 1, page, page + 1]);
  const nums = [...set].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b);
  const out: Array<number | 'ellipsis'> = [];
  for (let i = 0; i < nums.length; i++) {
    if (i > 0 && nums[i] - nums[i - 1] > 1) out.push('ellipsis');
    out.push(nums[i]);
  }
  return out;
}

export function DirectoryPagination({
  page,
  totalPages,
  total,
  pageSize,
  searchParams,
  className,
}: DirectoryPaginationProps) {
  if (totalPages <= 1 || total <= pageSize) return null;

  const prev = page > 1 ? page - 1 : null;
  const next = page < totalPages ? page + 1 : null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const params = new URLSearchParams(searchParams);

  function href(target: number) {
    return buildDirectoryHref(params, { page: target > 1 ? String(target) : null });
  }

  return (
    <nav
      aria-label="Directory pages"
      className={cn(
        'mt-8 flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between',
        className
      )}
    >
      <p className="text-sm text-muted-foreground">
        Showing {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}{' '}
        verified research listings
        <span className="text-muted-foreground/80">
          {' '}
          · page {page} of {totalPages.toLocaleString()}
        </span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {prev != null ? (
          <Link
            href={href(prev)}
            className="inline-flex min-h-11 items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-medium text-foreground hover:bg-muted"
            rel="prev"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Previous
          </Link>
        ) : (
          <span className="inline-flex min-h-11 items-center gap-1 rounded-lg border px-3 py-1.5 text-sm text-muted-foreground opacity-50">
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Previous
          </span>
        )}
        <ol className="hidden items-center gap-1 sm:flex">
          {pageWindow(page, totalPages).map((item, idx) =>
            item === 'ellipsis' ? (
              <li
                key={`e-${idx}`}
                className="px-1 text-sm text-muted-foreground"
                aria-hidden
              >
                …
              </li>
            ) : (
              <li key={item}>
                <Link
                  href={href(item)}
                  aria-current={item === page ? 'page' : undefined}
                  className={cn(
                    'inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg border px-2 text-sm font-medium',
                    item === page
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  {item.toLocaleString()}
                </Link>
              </li>
            )
          )}
        </ol>
        {next != null ? (
          <Link
            href={href(next)}
            className="inline-flex min-h-11 items-center gap-1 rounded-lg border border-primary/30 bg-primary/5 px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary/10"
            rel="next"
          >
            Next
            <ChevronRight className="h-4 w-4" aria-hidden />
          </Link>
        ) : (
          <span className="inline-flex min-h-11 items-center gap-1 rounded-lg border px-3 py-1.5 text-sm text-muted-foreground opacity-50">
            Next
            <ChevronRight className="h-4 w-4" aria-hidden />
          </span>
        )}
      </div>
    </nav>
  );
}
