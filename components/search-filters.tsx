'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import { Search, SlidersHorizontal } from 'lucide-react';
import { INSURANCE_TYPES, SPECIALTIES, US_STATES } from '@/lib/constants';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SearchFiltersProps {
  className?: string;
}

export function SearchFilters({ className }: SearchFiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const query = searchParams.get('q') ?? '';
  const state = searchParams.get('state') ?? '';
  const insuranceType = searchParams.get('type') ?? '';
  const specialty = searchParams.get('specialty') ?? '';
  const verifiedOnly = searchParams.get('verified') === 'true';
  const minRating = searchParams.get('minRating') ?? '';

  const updateParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === '') {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      startTransition(() => {
        router.push(`/directory?${params.toString()}`);
      });
    },
    [router, searchParams]
  );

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updateParams({
      q: (formData.get('q') as string) || null,
      state: (formData.get('state') as string) || null,
      type: (formData.get('type') as string) || null,
      specialty: (formData.get('specialty') as string) || null,
      minRating: (formData.get('minRating') as string) || null,
      verified: formData.get('verified') === 'on' ? 'true' : null,
    });
  }

  function clearFilters() {
    startTransition(() => {
      router.push('/directory');
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={cn('space-y-4 rounded-xl border bg-card p-5 shadow-trust', className)}
    >
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <SlidersHorizontal className="h-4 w-4 text-primary" aria-hidden="true" />
        Filter agencies
      </div>

      <div className="relative">
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          name="q"
          defaultValue={query}
          placeholder="Search by name, city, or specialty..."
          className="pl-9"
        />
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="filter-state" className="text-xs text-muted-foreground mb-1.5 block">
            State
          </Label>
          <Select id="filter-state" name="state" defaultValue={state}>
            <option value="">All states</option>
            {US_STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="filter-type" className="text-xs text-muted-foreground mb-1.5 block">
            Insurance type
          </Label>
          <Select id="filter-type" name="type" defaultValue={insuranceType}>
            <option value="">All types</option>
            {INSURANCE_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="filter-specialty" className="text-xs text-muted-foreground mb-1.5 block">
            Specialty
          </Label>
          <Select id="filter-specialty" name="specialty" defaultValue={specialty}>
            <option value="">All specialties</option>
            {SPECIALTIES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <Label htmlFor="filter-rating" className="text-xs text-muted-foreground mb-1.5 block">
            Minimum rating
          </Label>
          <Select id="filter-rating" name="minRating" defaultValue={minRating}>
            <option value="">Any rating</option>
            <option value="3">3.0+</option>
            <option value="3.5">3.5+</option>
            <option value="4">4.0+</option>
            <option value="4.5">4.5+</option>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="filter-verified"
          name="verified"
          defaultChecked={verifiedOnly}
        />
        <Label htmlFor="filter-verified" className="text-sm font-normal cursor-pointer">
          Verified agencies only
        </Label>
      </div>

      <div className="flex gap-2 pt-1">
        <Button type="submit" disabled={isPending} className="flex-1">
          {isPending ? 'Searching…' : 'Apply filters'}
        </Button>
        <Button type="button" variant="outline" onClick={clearFilters} disabled={isPending}>
          Clear
        </Button>
      </div>
    </form>
  );
}