'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { MapPin, Search, Shield } from 'lucide-react';
import { DESTINATION_STATES } from '@/lib/destinations/data';
import { INSURANCE_TYPES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface HeroSearchProps {
  className?: string;
}

export function HeroSearch({ className }: HeroSearchProps) {
  const router = useRouter();
  const [destination, setDestination] = useState('');
  const [insuranceType, setInsuranceType] = useState('');

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();

    if (destination) {
      const state = DESTINATION_STATES.find((d) => d.slug === destination);
      if (state) params.set('state', state.code);
    }
    if (insuranceType) params.set('type', insuranceType);

    const query = params.toString();
    router.push(query ? `/directory?${query}` : '/directory');
  }

  return (
    <div className={cn('w-full max-w-3xl', className)}>
      <form
        onSubmit={handleSearch}
        className="rounded-2xl border bg-card p-4 md:p-5 shadow-trust-lg"
      >
        <div className="grid md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
          <div>
            <label
              htmlFor="hero-destination"
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5"
            >
              <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
              Destination / State
            </label>
            <Select
              id="hero-destination"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
            >
              <option value="">All destinations</option>
              {DESTINATION_STATES.map((d) => (
                <option key={d.slug} value={d.slug}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>

          <div>
            <label
              htmlFor="hero-insurance-type"
              className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5"
            >
              <Shield className="h-3.5 w-3.5" aria-hidden="true" />
              Insurance type
            </label>
            <Select
              id="hero-insurance-type"
              value={insuranceType}
              onChange={(e) => setInsuranceType(e.target.value)}
            >
              <option value="">All types</option>
              {INSURANCE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>

          <Button type="submit" size="lg" className="gap-2 min-h-[44px] md:min-h-[40px] w-full md:w-auto">
            <Search className="h-4 w-4" aria-hidden="true" />
            Find agents
          </Button>
        </div>
      </form>

      <p className="mt-3 text-center text-xs text-muted-foreground">
        Free to use · Independent directory · Licensed agencies only
      </p>
    </div>
  );
}