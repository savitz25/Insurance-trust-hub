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
  const [error, setError] = useState('');
  const errorId = 'home-zip-error';

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const digits = zip.trim().slice(0, 5);
    if (digits && digits.length !== 5) {
      setError('Enter a 5-digit U.S. ZIP code, or leave blank to open the directory.');
      return;
    }
    setError('');
    const params = new URLSearchParams();
    if (digits) params.set('zip', digits);
    params.set('verified', 'true');
    if (types.length === 1) params.set('type', types[0]!);
    else if (types.includes('health') || types.includes('medicare')) {
      params.set('specialty', 'Health');
    }
    const query = params.toString();
    router.push(query ? `/directory?${query}` : '/directory?verified=true');
  }

  function toggleType(value: string) {
    setTypes((prev) =>
      prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
    );
  }

  return (
    <form
      onSubmit={handleSearch}
      className={cn('w-full min-w-0 max-w-2xl', className)}
      aria-label="Search public insurance directory listings by ZIP code"
      noValidate
    >
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <MapPin
            className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            style={{ color: INSURANCE_BRAND.shield }}
            aria-hidden
          />
          <Input
            id="home-directory-zip"
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            pattern="[0-9]{5}"
            maxLength={5}
            placeholder="5-digit ZIP (optional)"
            value={zip}
            onChange={(e) => {
              setZip(e.target.value.replace(/\D/g, '').slice(0, 5));
              if (error) setError('');
            }}
            className="h-12 pl-10 text-base text-[#1E293B] focus-visible:ring-[#0284C7]"
            aria-label="ZIP code for public directory listings"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? errorId : 'home-directory-zip-hint'}
          />
        </div>
        <Button type="submit" size="lg" variant="trust" className="h-12 shrink-0 gap-2">
          <Search className="h-4 w-4" aria-hidden />
          Search listings
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
              aria-pressed={active}
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
      <p id="home-directory-zip-hint" className="mt-2 text-xs leading-relaxed" style={{ color: INSURANCE_BRAND.ink }}>
        This searches public directory listings near a ZIP. It is not a search of all graph agencies, producers, or
        legal insurers. Not a ranked marketplace.
      </p>
      {error ? (
        <p id={errorId} role="alert" className="mt-2 text-xs font-medium text-[#B91C1C]">
          {error}
        </p>
      ) : null}
    </form>
  );
}
