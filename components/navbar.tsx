'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import {
  Bookmark,
  ChevronDown,
  LogOut,
  Menu,
  Phone,
  X,
} from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { Button } from '@/components/ui/button';
import { useMyInsuranceOptional } from '@/components/my-insurance/my-insurance-provider';
import { listSavedProviderSlugsAction, signOutAction } from '@/actions/my-insurance';
import {
  DIRECTORY_NAV,
  NAV_CTA,
  PRIMARY_NAV,
  navLinkActive,
} from '@/lib/nav/primary-nav';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const linkClass =
  'font-medium text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trust focus-visible:ring-offset-2';

const tapTarget =
  'min-h-[48px] flex items-center rounded-md px-2 -mx-2 transition-colors hover:bg-muted/40 active:bg-muted/60';

/**
 * Sticky primary header for InsuranceTrustHub.
 * Desktop (lg+): Directory · Calculators · Guides · Methodology · Trust & Transparency
 *   + My Insurance · Contact · Compare agencies CTA
 * Mobile: My Insurance + CTA chip + hamburger with the same primary items.
 */
export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const mi = useMyInsuranceOptional();
  const [isOpen, setIsOpen] = useState(false);
  const [directoriesOpen, setDirectoriesOpen] = useState(false);
  const [mobileDirectoriesOpen, setMobileDirectoriesOpen] = useState(false);
  const [accountBadge, setAccountBadge] = useState(0);
  const panelId = useId();
  const mobilePanelId = useId();
  const dirRef = useRef<HTMLDivElement>(null);

  const signedIn = Boolean(mi?.user);
  const authReady = !mi?.loading;
  const showBadge = authReady && signedIn && accountBadge > 0;

  useEffect(() => {
    let cancelled = false;

    async function syncAccountBadge() {
      if (!mi?.user) {
        if (!cancelled) setAccountBadge(0);
        return;
      }
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

  useEffect(() => {
    if (!directoriesOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!dirRef.current?.contains(e.target as Node)) setDirectoriesOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDirectoriesOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [directoriesOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobile();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  function closeMobile() {
    setIsOpen(false);
    setMobileDirectoriesOpen(false);
  }

  async function handleSignOut() {
    await signOutAction();
    await mi?.signOutLocal();
    setAccountBadge(0);
    toast.message('Signed out — research stays on this device');
    router.refresh();
    closeMobile();
  }

  const directoryActive = DIRECTORY_NAV.some((l) => navLinkActive(l.href, pathname));

  return (
    <nav
      className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      aria-label="Primary"
    >
      <div className="container mx-auto relative flex h-16 sm:h-20 items-center justify-between gap-2 px-4 overflow-visible">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <BrandLogo priority />
          <div
            className="hidden md:flex items-center rounded-full bg-trust/10 px-2 py-0.5 text-[9px] font-semibold tracking-[1px] text-trust border border-trust/20"
            title="Independent DOI-verified directory · no paid placements"
          >
            INDEPENDENT
          </div>
        </div>

        {/* Desktop primary nav — lg+ (not xl-only) */}
        <div className="hidden lg:flex items-center gap-3 xl:gap-4 text-sm">
          <div className="relative" ref={dirRef}>
            <button
              type="button"
              onClick={() => setDirectoriesOpen((o) => !o)}
              className={cn(
                linkClass,
                'inline-flex items-center gap-1',
                directoryActive && 'font-semibold text-foreground'
              )}
              aria-expanded={directoriesOpen}
              aria-controls={panelId}
              aria-haspopup="true"
            >
              Directory
              <ChevronDown
                className={cn('h-4 w-4 transition-transform', directoriesOpen && 'rotate-180')}
                aria-hidden
              />
            </button>
            {directoriesOpen ? (
              <div
                id={panelId}
                role="menu"
                className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border bg-card py-2 shadow-trust-lg"
              >
                {DIRECTORY_NAV.map((link) => {
                  const active = navLinkActive(link.href, pathname);
                  return (
                    <Link
                      key={link.href}
                      role="menuitem"
                      prefetch={false}
                      href={link.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'block px-4 py-2.5 hover:bg-secondary focus-visible:outline-none focus-visible:bg-secondary',
                        active && 'bg-secondary/80'
                      )}
                      onClick={() => setDirectoriesOpen(false)}
                    >
                      <span className="block text-sm font-medium text-foreground">
                        {link.label}
                      </span>
                      {link.description ? (
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {link.description}
                        </span>
                      ) : null}
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>

          {PRIMARY_NAV.filter((l) => l.href !== '/directory').map((link) => {
            const active = navLinkActive(link.href, pathname);
            return (
              <Link
                key={link.href}
                prefetch={false}
                href={link.href}
                className={cn(linkClass, active && 'font-semibold text-foreground')}
                aria-current={active ? 'page' : undefined}
              >
                {link.label}
              </Link>
            );
          })}

          <Button size="sm" variant="outline" asChild className="gap-1.5">
            <Link
              href="/my-insurance"
              aria-label={
                showBadge
                  ? `My Insurance, ${accountBadge} saved agencies`
                  : 'My Insurance'
              }
              aria-current={navLinkActive('/my-insurance', pathname) ? 'page' : undefined}
              title={
                signedIn
                  ? 'My Insurance — coverage research HQ'
                  : 'My Insurance — research passport (sign in optional on HQ)'
              }
            >
              <Bookmark className="h-4 w-4 text-teal-700" aria-hidden />
              <span>My Insurance</span>
              {showBadge ? (
                <span className="rounded-full bg-teal-600 px-1.5 py-0.5 text-[10px] font-semibold text-white tabular-nums">
                  {accountBadge > 99 ? '99+' : accountBadge}
                </span>
              ) : null}
            </Link>
          </Button>

          <Link
            prefetch={false}
            href="/contact"
            className={cn(
              linkClass,
              navLinkActive('/contact', pathname) && 'font-semibold text-foreground'
            )}
            aria-current={navLinkActive('/contact', pathname) ? 'page' : undefined}
          >
            Contact
          </Link>

          <Button size="sm" variant="trust" asChild className="gap-2 min-h-9">
            <Link prefetch={false} href={NAV_CTA.href}>
              {NAV_CTA.label}
            </Link>
          </Button>
        </div>

        {/* Mobile / tablet right cluster */}
        <div className="flex lg:hidden shrink-0 items-center gap-1.5 sm:gap-2">
          <Button size="sm" variant="outline" asChild className="gap-1.5 px-2.5 sm:px-3">
            <Link
              href="/my-insurance"
              aria-label={
                showBadge
                  ? `My Insurance, ${accountBadge} saved agencies`
                  : 'My Insurance'
              }
              title="My Insurance"
            >
              <Bookmark className="h-4 w-4 text-teal-700" aria-hidden />
              <span className="hidden sm:inline">My Insurance</span>
              {showBadge ? (
                <span className="rounded-full bg-teal-600 px-1.5 py-0.5 text-[10px] font-semibold text-white tabular-nums">
                  {accountBadge > 99 ? '99+' : accountBadge}
                </span>
              ) : null}
            </Link>
          </Button>
          <Button size="sm" variant="trust" asChild className="min-h-[44px] px-2.5 sm:px-3">
            <Link prefetch={false} href={NAV_CTA.href}>
              <span className="sm:hidden">Directory</span>
              <span className="hidden sm:inline">{NAV_CTA.label}</span>
            </Link>
          </Button>
          <button
            type="button"
            className="rounded-md p-2 min-h-11 min-w-11 inline-flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trust"
            onClick={() => setIsOpen((o) => !o)}
            aria-label={isOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isOpen}
            aria-controls={mobilePanelId}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {isOpen ? (
        <div
          id={mobilePanelId}
          className="lg:hidden border-t bg-background px-4 py-4 max-h-[min(80vh,640px)] overflow-y-auto overscroll-contain shadow-md"
        >
          <nav aria-label="Mobile navigation" className="flex flex-col gap-1 text-sm">
            <Link
              href="/my-insurance"
              className={cn(
                'flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-3 font-semibold min-h-[48px]',
                navLinkActive('/my-insurance', pathname) && 'border-trust/40 bg-trust/5'
              )}
              aria-current={navLinkActive('/my-insurance', pathname) ? 'page' : undefined}
              onClick={closeMobile}
            >
              <Bookmark className="h-4 w-4 text-teal-700" aria-hidden />
              My Insurance
              {showBadge ? (
                <span className="rounded-full bg-teal-600 px-1.5 py-0.5 text-[10px] font-semibold text-white tabular-nums">
                  {accountBadge > 99 ? '99+' : accountBadge}
                </span>
              ) : null}
            </Link>

            <div className="border-b border-border/50 pb-2 mb-1">
              <button
                type="button"
                className={cn(
                  'w-full justify-between font-medium text-muted-foreground hover:text-foreground',
                  tapTarget
                )}
                aria-expanded={mobileDirectoriesOpen}
                onClick={() => setMobileDirectoriesOpen((o) => !o)}
              >
                <span>Directory</span>
                <ChevronDown
                  className={cn(
                    'h-4 w-4 transition-transform',
                    mobileDirectoriesOpen && 'rotate-180'
                  )}
                  aria-hidden
                />
              </button>
              {mobileDirectoriesOpen ? (
                <div className="pl-1 pb-2 pt-1 space-y-1">
                  {DIRECTORY_NAV.map((link) => {
                    const active = navLinkActive(link.href, pathname);
                    return (
                      <Link
                        key={link.href}
                        prefetch={false}
                        href={link.href}
                        className={cn(
                          'text-muted-foreground hover:text-foreground',
                          tapTarget,
                          active && 'font-semibold text-foreground'
                        )}
                        aria-current={active ? 'page' : undefined}
                        onClick={closeMobile}
                      >
                        {link.label}
                      </Link>
                    );
                  })}
                </div>
              ) : null}
            </div>

            {PRIMARY_NAV.filter((l) => l.href !== '/directory').map((link) => {
              const active = navLinkActive(link.href, pathname);
              return (
                <Link
                  key={link.href}
                  prefetch={false}
                  href={link.href}
                  className={cn(
                    'font-medium text-muted-foreground hover:text-foreground border-b border-border/50 pb-2 mb-1',
                    tapTarget,
                    active && 'font-semibold text-foreground'
                  )}
                  aria-current={active ? 'page' : undefined}
                  onClick={closeMobile}
                >
                  {link.label}
                </Link>
              );
            })}

            <Link
              href="/contact"
              className={cn(
                'font-medium text-muted-foreground hover:text-foreground border-b border-border/50 pb-2 mb-1',
                tapTarget,
                navLinkActive('/contact', pathname) && 'font-semibold text-foreground'
              )}
              aria-current={navLinkActive('/contact', pathname) ? 'page' : undefined}
              onClick={closeMobile}
            >
              <span className="inline-flex items-center gap-2">
                <Phone className="h-4 w-4" aria-hidden />
                Contact
              </span>
            </Link>

            {signedIn ? (
              <button
                type="button"
                className={cn('w-full text-left font-medium', tapTarget)}
                onClick={() => void handleSignOut()}
              >
                <span className="inline-flex items-center gap-2">
                  <LogOut className="h-4 w-4" aria-hidden />
                  Sign out
                </span>
              </button>
            ) : null}

            <Button variant="trust" className="w-full mt-3 min-h-[48px]" asChild>
              <Link prefetch={false} href={NAV_CTA.href} onClick={closeMobile}>
                {NAV_CTA.label}
              </Link>
            </Button>
          </nav>
        </div>
      ) : null}
    </nav>
  );
}
