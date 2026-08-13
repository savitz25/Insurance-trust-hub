'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { Grid3X3, List, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface DirectoryControlsProps {
  total: number;
  showing?: number;
  page?: number;
  pageSize?: number;
  className?: string;
}

export function DirectoryControls({
  total,
  showing,
  page = 1,
  pageSize,
  className,
}: DirectoryControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const sort = searchParams.get('sort') ?? 'name';
  const view = searchParams.get('view') ?? 'grid';
  const from =
    pageSize && total > 0 ? (page - 1) * pageSize + 1 : showing ? 1 : 0;
  const to =
    pageSize && total > 0
      ? Math.min(page * pageSize, total)
      : showing ?? total;
  const showRange = total > 0 && (typeof showing === 'number' ? showing < total : page > 1);

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete('page');
    params.set('verified', 'true');
    startTransition(() => {
      router.push(`/directory?${params.toString()}`);
    });
  }

  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4', className)}>
      <p className="text-sm text-muted-foreground">
        {showRange ? (
          <>
            Showing{' '}
            <span className="font-semibold text-foreground">
              {from.toLocaleString()}–{to.toLocaleString()}
            </span>{' '}
            of{' '}
            <span className="font-semibold text-foreground">
              {total.toLocaleString()}
            </span>{' '}
            verified research listings
          </>
        ) : (
          <>
            <span className="font-semibold text-foreground">
              {total.toLocaleString()}
            </span>{' '}
            verified research listing{total === 1 ? '' : 's'}
          </>
        )}
        {isPending && <span className="ml-2 text-xs">Updating…</span>}
      </p>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <ArrowUpDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          <Select
            value={sort}
            onChange={(e) => updateParam('sort', e.target.value)}
            className="w-[160px]"
            aria-label="Sort agencies"
          >
            <option value="name">Name A–Z</option>
            <option value="relevance">Relevance</option>
            <option value="rating">Third-party rating (not an ITH rank)</option>
            <option value="reviews">Review count</option>
          </Select>
        </div>

        <div className="flex rounded-lg border p-0.5" role="group" aria-label="View mode">
          <Button
            type="button"
            variant={view === 'grid' ? 'default' : 'ghost'}
            size="icon"
            className="h-9 w-9"
            onClick={() => updateParam('view', 'grid')}
            aria-label="Grid view"
            aria-pressed={view === 'grid'}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={view === 'list' ? 'default' : 'ghost'}
            size="icon"
            className="h-9 w-9"
            onClick={() => updateParam('view', 'list')}
            aria-label="List view"
            aria-pressed={view === 'list'}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}