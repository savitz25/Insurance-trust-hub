'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BrandLogo } from '@/components/BrandLogo';
import { Menu, X, Phone, ChevronDown, Bookmark, LogIn, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMyInsuranceOptional } from '@/components/my-insurance/my-insurance-provider';
import { guestSavedCount } from '@/lib/my-insurance/storage';
import { getCompareTray } from '@/lib/my-insurance/compare-storage';
import { signOutAction } from '@/actions/my-insurance';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

/** Primary nav list — My Insurance lives as persistent top-right control (My Move parity). */
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
  const router = useRouter();

  useEffect(() => {
    const sync = () => {
      const guest = guestSavedCount();
      const cloud = mi?.user ? mi.savedProviderSlugs.size : 0;
      const compare = getCompareTray().length;
      // Union-aware: max of guest plan count, cloud∪local slug set, compare tray
      setBadgeCount(Math.max(guest, cloud, compare > 0 && guest === 0 && cloud === 0 ? compare : 0));
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

  async function handleSignOut() {
    await signOutAction();
    await mi?.signOutLocal();
    toast.message('Signed out — research stays on this device');
    router.refresh();
    setIsOpen(false);
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-20 items-center justify-between gap-2 px-4">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <BrandLogo priority />
          <div className="hidden md:flex items-center rounded-full bg-trust/10 px-2 py-0.5 text-[9px] font-semibold tracking-[1px] text-trust border border-trust/20">
            INDEPENDENT
          </div>
        </div>

        {/* Desktop center links */}
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
        </div>

        {/* Always-visible top-right: My Insurance + account (My Move parity) */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Button size="sm" variant="outline" asChild className="gap-1.5 sm:gap-2">
            <Link href="/my-insurance" aria-label="My Insurance">
              <Bookmark className="h-4 w-4 text-teal-700" />
              <span className="hidden sm:inline">My Insurance</span>
              {badgeCount > 0 ? (
                <span className="rounded-full bg-teal-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  {badgeCount}
                </span>
              ) : null}
            </Link>
          </Button>

          {mi?.user ? (
            <Button
              size="sm"
              variant="ghost"
              className="hidden gap-1.5 text-slate-600 sm:inline-flex"
              onClick={() => void handleSignOut()}
              aria-label="Sign out"
            >
              <LogOut className="h-4 w-4" />
              <span className="max-w-[9rem] truncate text-xs">{mi.user.email}</span>
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              className="gap-1.5"
              onClick={() => mi?.openAuth({ redirectPath: '/my-insurance' })}
            >
              <LogIn className="h-4 w-4" />
              <span className="hidden sm:inline">Sign in</span>
            </Button>
          )}

          <Button size="sm" variant="trust" asChild className="hidden gap-2 lg:inline-flex">
            <Link href="/contact">
              <Phone className="h-4 w-4" /> Contact
            </Link>
          </Button>

          <button
            type="button"
            className="xl:hidden p-2"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
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
          <Link
            href="/my-insurance"
            className="flex items-center gap-2 font-medium text-teal-800"
            onClick={() => setIsOpen(false)}
          >
            <Bookmark className="h-4 w-4" />
            My Insurance
            {badgeCount > 0 ? (
              <span className="rounded-full bg-teal-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {badgeCount}
              </span>
            ) : null}
          </Link>
          {mi?.user ? (
            <button
              type="button"
              className="flex items-center gap-2 font-medium text-left w-full"
              onClick={() => void handleSignOut()}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          ) : (
            <button
              type="button"
              className="flex items-center gap-2 font-medium text-left w-full"
              onClick={() => {
                setIsOpen(false);
                mi?.openAuth({ redirectPath: '/my-insurance' });
              }}
            >
              <LogIn className="h-4 w-4" />
              Sign in
            </button>
          )}
          <Link href="/contact" className="block font-medium" onClick={() => setIsOpen(false)}>
            Contact
          </Link>
        </div>
      )}
    </nav>
  );
}
