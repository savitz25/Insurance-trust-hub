'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BrandLogo } from '@/components/BrandLogo';
import { Menu, X, Phone, ChevronDown, Bookmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMyInsuranceOptional } from '@/components/my-insurance/my-insurance-provider';
import { guestSavedCount } from '@/lib/my-insurance/storage';
import { getCompareTray } from '@/lib/my-insurance/compare-storage';

/** Single primary nav list - My Insurance is the CTA button only (not duplicated here). */
const NAV_LINKS = [
  { href: '/hubs', label: 'Health Hubs' },
  { href: '/hubs/browse', label: 'State & MSA' },
  { href: '/calculators', label: 'Calculators' },
  { href: '/methodology', label: 'Methodology' },
  { href: '/about', label: 'About' },
] as const;

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [directoriesOpen, setDirectoriesOpen] = useState(false);
  const [badgeCount, setBadgeCount] = useState(0);
  const mi = useMyInsuranceOptional();

  useEffect(() => {
    const sync = () => {
      const guest = guestSavedCount();
      const cloud = mi?.user ? mi.savedProviderSlugs.size : 0;
      const compare = getCompareTray().length;
      // Prefer shortlist/saved count; fall back to compare set size for awareness
      setBadgeCount(Math.max(cloud, guest, compare > 0 && guest === 0 && cloud === 0 ? compare : 0));
    };
    sync();
    window.addEventListener('ith-my-insurance-store', sync);
    window.addEventListener('ith-compare-tray', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('ith-my-insurance-store', sync);
      window.removeEventListener('ith-compare-tray', sync);
      window.removeEventListener('storage', sync);
    };
  }, [mi?.user, mi?.savedProviderSlugs.size]);

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
                <Link
                  href="/directory"
                  className="block px-4 py-2 text-sm hover:bg-secondary"
                  onClick={() => setDirectoriesOpen(false)}
                >
                  All Agents & Agencies
                </Link>
                <Link
                  href="/hubs"
                  className="block px-4 py-2 text-sm hover:bg-secondary"
                  onClick={() => setDirectoriesOpen(false)}
                >
                  Health Insurance Hubs
                </Link>
                <Link
                  href="/destinations"
                  className="block px-4 py-2 text-sm hover:bg-secondary"
                  onClick={() => setDirectoriesOpen(false)}
                >
                  Relocation Destinations
                </Link>
              </div>
            )}
          </div>
          {NAV_LINKS.map((link) => (
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
              {badgeCount > 0 ? (
                <span className="rounded-full bg-teal-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {badgeCount}
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
          <Link href="/directory" className="block font-medium" onClick={() => setIsOpen(false)}>
            Directories
          </Link>
          {NAV_LINKS.map((link) => (
            <Link
              key={`${link.href}-${link.label}`}
              href={link.href}
              className="block font-medium"
              onClick={() => setIsOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <Link href="/my-insurance" className="block font-medium" onClick={() => setIsOpen(false)}>
            My Insurance
            {badgeCount > 0 ? (
              <span className="ml-2 rounded-full bg-teal-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {badgeCount}
              </span>
            ) : null}
          </Link>
          <Link href="/contact" className="block font-medium" onClick={() => setIsOpen(false)}>
            Contact
          </Link>
        </div>
      )}
    </nav>
  );
}
