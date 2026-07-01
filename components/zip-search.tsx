'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { INSURANCE_TYPES } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface ZipSearchProps {
  className?: string;
  defaultZip?: string;
}

export function ZipSearch({ className, defaultZip = '' }: ZipSearchProps) {
  const router = useRouter();
  const [zip, setZip] = useState(defaultZip);
  const [types, setTypes] = useState<string[]>(['health', 'medicare']);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (zip.trim()) params.set('zip', zip.trim().slice(0, 5));
    if (types.length) params.set('type', types.join(','));
    const query = params.toString();
    router.push(query ? `/directory?${query}` : '/directory');
  }

  function toggleType(value: string) {
    setTypes((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
    );
  }

  return (
    <form onSubmit={handleSearch} className={cn('w-full max-w-2xl', className)}>
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{5}"
            maxLength={5}
            placeholder="Enter ZIP code"
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
            className="pl-10 h-12 text-base"
            aria-label="ZIP code"
          />
        </div>
        <Button type="submit" size="lg" className="h-12 gap-2 shrink-0">
          <Search className="h-4 w-4" />
          Search Agents
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 justify-center sm:justify-start">
        {INSURANCE_TYPES.slice(0, 6).map((type) => (
          <button
            key={type.value}
            type="button"
            onClick={() => toggleType(type.value)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium border transition-colors',
              types.includes(type.value)
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-background text-muted-foreground border-border hover:border-primary/40'
            )}
          >
            {type.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted-foreground text-center sm:text-left">
        ZIP search auto-detects your county/MSA and ranks local verified agents. 100% data-driven — never sponsored.
      </p>
    </form>
  );
}