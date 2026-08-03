'use client';

import Link from 'next/link';
import { useState } from 'react';
import { BrandLogo } from '@/components/BrandLogo';
import { Menu, X, Phone, ChevronDown, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMyInsuranceOptional } from '@/components/my-insurance/my-insurance-provider';

const NAV_LINKS = [
  { href: '/directory', label: 'DIRECTORIES' },
  { href: '/hubs', label: 'HEALTH HUBS' },
  { href: '/hubs/browse', label: 'STATE & MSA BROWSER' },
  { href: '/calculators', label: 'CALCULATORS' },
  { href: '/my-insurance', label: 'MY INSURANCE' },
  { href: '/methodology', label: 'METHODOLOGY' },
  { href: '/about', label: 'ABOUT' },
] as const;

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [directoriesOpen, setDirectoriesOpen] = useState(false);
  const mi = useMyInsuranceOptional();
  const savedCount = mi?.user ? mi.savedProviderSlugs.size : 0;

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <BrandLogo priority />
          <div className="hidden md:flex items-center rounded-full bg-trust/10 px-2 py-0.5 text-[9px] font-semibold tracking-[1px] text-trust border border-trust/20">
            INDEPENDENT
          </div>
        </div>

        <div className="hidden xl:flex items-center gap-6 text-sm">
          <div className="relative">
            <button
              type="button"
              onClick={() => setDirectoriesOpen(!directoriesOpen)}
              className="inline-flex items-center gap-1 font-medium text-muted-foreground hover:text-foreground"
              aria-expanded={directoriesOpen}
            >
              Directories <ChevronDown className="h-4 w-4" />
            </button>
            {directoriesOpen && (
              <div className="absolute left-0 top-full z-50 mt-2 w-52 rounded-xl border bg-card py-2 shadow-trust-lg">
                <Link href="/directory" className="block px-4 py-2 text-sm hover:bg-secondary" onClick={() => setDirectoriesOpen(false)}>
                  All Agents & Agencies
                </Link>
                <Link href="/hubs" className="block px-4 py-2 text-sm hover:bg-secondary" onClick={() => setDirectoriesOpen(false)}>
                  Health Insurance Hubs
                </Link>
                <Link href="/destinations" className="block px-4 py-2 text-sm hover:bg-secondary" onClick={() => setDirectoriesOpen(false)}>
                  Relocation Destinations
                </Link>
              </div>
            )}
          </div>
          {NAV_LINKS.slice(1).map((link) => (
            <Link
              key={`${link.href}-${link.label}`}
              prefetch={false}
              href={link.href}
              className="font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <Button size="sm" variant="outline" asChild className="gap-2">
            <Link href="/my-insurance" aria-label="My Insurance">
              <Bookmark className="h-4 w-4" />
              My Insurance
              {savedCount > 0 ? (
                <span className="rounded-full bg-teal-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {savedCount}
                </span>
              ) : null}
            </Link>
          </Button>
          <Button size="sm" variant="trust" asChild className="gap-2">
            <Link href="/contact">
              <Phone className="h-4 w-4" /> Contact
            </Link>
          </Button>
        </div>

        <button
          type="button"
          className="xl:hidden p-2"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? 'Close menu' : 'Open menu'}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {isOpen && (
        <div className="xl:hidden border-t bg-background px-4 py-4 space-y-3">
          <Link href="/directory" className="block font-medium" onClick={() => setIsOpen(false)}>Directories</Link>
          {NAV_LINKS.map((link) => (
            <Link key={`${link.href}-${link.label}`} href={link.href} className="block font-medium" onClick={() => setIsOpen(false)}>
              {link.label}
            </Link>
          ))}
          <Link href="/my-insurance" className="block font-medium" onClick={() => setIsOpen(false)}>
            My Insurance{savedCount > 0 ? ` (${savedCount})` : ''}
          </Link>
          <Link href="/contact" className="block font-medium" onClick={() => setIsOpen(false)}>Contact</Link>
        </div>
      )}
    </nav>
  );
}