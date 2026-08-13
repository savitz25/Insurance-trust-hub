'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { INSURANCE_TYPES } from '@/lib/constants';
import { INSURANCE_BRAND } from '@/lib/design/insurance-design-system';
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
    <form
      onSubmit={handleSearch}
      className={cn('w-full max-w-2xl', className)}
      aria-label="Search licensed agencies by ZIP"
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <MapPin
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: INSURANCE_BRAND.shield }}
            aria-hidden
          />
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{5}"
            maxLength={5}
            placeholder="Enter ZIP code"
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
            className="h-12 pl-10 text-base text-[#1E293B] focus-visible:ring-[#0284C7]"
            aria-label="ZIP code"
          />
        </div>
        <Button type="submit" size="lg" variant="trust" className="h-12 shrink-0 gap-2">
          <Search className="h-4 w-4" aria-hidden />
          Find agencies
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap justify-start gap-2">
        {INSURANCE_TYPES.slice(0, 6).map((type) => {
          const active = types.includes(type.value);
          return (
            <button
              key={type.value}
              type="button"
              onClick={() => toggleType(type.value)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                active
                  ? 'border-[#0284C7] bg-[#0284C7] text-white'
                  : 'border-[#E2E8F0] bg-white text-[#1E293B] hover:border-[#0284C7]/40 hover:bg-[#E0F2FE]/60'
              )}
            >
              {type.label}
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs leading-relaxed" style={{ color: INSURANCE_BRAND.ink }}>
        Local research only — never sponsored placements. Not a ranked marketplace.
      </p>
    </form>
  );
}
