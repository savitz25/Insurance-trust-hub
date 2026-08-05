'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BrandLogo } from '@/components/BrandLogo';
import { Menu, X, Phone, ChevronDown, Bookmark, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMyInsuranceOptional } from '@/components/my-insurance/my-insurance-provider';
import { listSavedProviderSlugsAction } from '@/actions/my-insurance';
import { signOutAction } from '@/actions/my-insurance';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

/** Primary nav list — My Insurance is the sole account entry (no separate Sign in). */
const NAV_LINKS = [
  { href: '/hubs', label: 'Health Hubs' },
  { href: '/hubs/browse', label: 'State & MSA' },
  { href: '/calculators', label: 'Calculators' },
  { href: '/methodology', label: 'Methodology' },
  { href: '/about', label: 'About' },
] as const;

/**
 * Header account control (My Move parity):
 * - Logged out: “My Insurance” only — no guest badge, no separate Sign in
 * - Logged in: badge = cloud/account saved providers only (not guest localStorage)
 * Sign-in lives on HQ / auth modal.
 */
export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [directoriesOpen, setDirectoriesOpen] = useState(false);
  const [accountBadge, setAccountBadge] = useState(0);
  const mi = useMyInsuranceOptional();
  const router = useRouter();
  const signedIn = Boolean(mi?.user);
  const authReady = !mi?.loading;

  useEffect(() => {
    let cancelled = false;

    async function syncAccountBadge() {
      if (!mi?.user) {
        if (!cancelled) setAccountBadge(0);
        return;
      }
      // Account-scoped cloud count only — never guest localStorage / compare tray.
      try {
        const cloud = await listSavedProviderSlugsAction();
        if (!cancelled) setAccountBadge(cloud.length);
      } catch {
        if (!cancelled) setAccountBadge(0);
      }
    }

    void syncAccountBadge();
    const onStore = () => {
      void syncAccountBadge();
    };
    window.addEventListener('ith-my-insurance-store', onStore);
    return () => {
      cancelled = true;
      window.removeEventListener('ith-my-insurance-store', onStore);
    };
  }, [mi?.user]);

  const showBadge = authReady && signedIn && accountBadge > 0;

  async function handleSignOut() {
    await signOutAction();
    await mi?.signOutLocal();
    setAccountBadge(0);
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

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
          <Button size="sm" variant="outline" asChild className="gap-1.5 sm:gap-2">
            <Link
              href="/my-insurance"
              aria-label={
                showBadge
                  ? `My Insurance, ${accountBadge} saved agencies`
                  : 'My Insurance'
              }
              title={
                signedIn
                  ? 'My Insurance — coverage research HQ'
                  : 'My Insurance — research passport (sign in optional on HQ)'
              }
            >
              <Bookmark className="h-4 w-4 text-teal-700" />
              <span className="hidden sm:inline">My Insurance</span>
              {showBadge ? (
                <span className="rounded-full bg-teal-600 px-1.5 py-0.5 text-[10px] font-semibold text-white tabular-nums">
                  {accountBadge > 99 ? '99+' : accountBadge}
                </span>
              ) : null}
            </Link>
          </Button>

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
            {showBadge ? (
              <span className="rounded-full bg-teal-600 px-1.5 py-0.5 text-[10px] font-semibold text-white tabular-nums">
                {accountBadge > 99 ? '99+' : accountBadge}
              </span>
            ) : null}
          </Link>
          {/* Sign out only when signed in — no redundant Sign in row */}
          {signedIn ? (
            <button
              type="button"
              className="flex w-full items-center gap-2 text-left font-medium"
              onClick={() => void handleSignOut()}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          ) : null}
          <Link href="/contact" className="block font-medium" onClick={() => setIsOpen(false)}>
            Contact
          </Link>
        </div>
      )}
    </nav>
  );
}
