'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { Grid3X3, List, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface DirectoryControlsProps {
  total: number;
  className?: string;
}

export function DirectoryControls({ total, className }: DirectoryControlsProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const sort = searchParams.get('sort') ?? 'rating';
  const view = searchParams.get('view') ?? 'grid';

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    startTransition(() => {
      router.push(`/directory?${params.toString()}`);
    });
  }

  return (
    <div className={cn('flex flex-col sm:flex-row sm:items-center justify-between gap-4', className)}>
      <p className="text-sm text-muted-foreground">
        <span className="font-semibold text-foreground">{total}</span> agenc
        {total === 1 ? 'y' : 'ies'} found
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
            <option value="rating">Top rated</option>
            <option value="reviews">Most reviews</option>
            <option value="relevance">Relevance</option>
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