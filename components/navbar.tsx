'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useId, useState } from 'react';
import { Bookmark, LogOut, Menu, X } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { Button } from '@/components/ui/button';
import { SwitchHubMenu } from '@/components/switch-hub-menu';
import { useMyInsuranceOptional } from '@/components/my-insurance/my-insurance-provider';
import { listSavedProviderSlugsAction, signOutAction } from '@/actions/my-insurance';
import {
  INSURANCE_BRAND,
  INSURANCE_HEADER_CTA,
  INSURANCE_HEADER_NAV,
  INSURANCE_LAYER_LABEL,
} from '@/lib/design/insurance-design-system';
import { navLinkActive } from '@/lib/nav/primary-nav';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * Insurance header — Phase 1 design system.
 * Logo · insurance nav · My Insurance · Compare CTA · Switch Hub.
 */
export function Navbar() {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const mi = useMyInsuranceOptional();
  const [isOpen, setIsOpen] = useState(false);
  const [accountBadge, setAccountBadge] = useState(0);
  const mobilePanelId = useId();

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
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  async function handleSignOut() {
    await signOutAction();
    await mi?.signOutLocal();
    setAccountBadge(0);
    toast.message('Signed out — research stays on this device');
    router.refresh();
    setIsOpen(false);
  }

  const linkClass = (href: string) => {
    const active = navLinkActive(href, pathname);
    return cn(
      'font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7] focus-visible:ring-offset-2 rounded-sm whitespace-nowrap',
      active ? 'text-[#0284C7]' : 'text-[#0A2540] hover:text-[#0284C7]'
    );
  };

  const myInsuranceBtn = (
    <Link
      href="/my-insurance"
      aria-label={showBadge ? `My Insurance, ${accountBadge} saved agencies` : 'My Insurance'}
      title={
        signedIn
          ? 'My Insurance — coverage research HQ'
          : 'My Insurance — research passport (sign in optional on HQ)'
      }
      className="inline-flex h-9 items-center gap-1.5 rounded-xl border bg-white px-3 text-xs font-semibold text-[#0A2540] transition-colors hover:border-[#0284C7]/40 hover:bg-[#E0F2FE]/50 hover:text-[#0284C7]"
      style={{
        borderColor: INSURANCE_BRAND.border,
      }}
      onClick={() => setIsOpen(false)}
    >
      <Bookmark className="h-3.5 w-3.5" style={{ color: INSURANCE_BRAND.shield }} aria-hidden />
      <span className="hidden sm:inline">My Insurance</span>
      {showBadge ? (
        <span
          className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white tabular-nums"
          style={{ backgroundColor: INSURANCE_BRAND.sapphire }}
        >
          {accountBadge > 99 ? '99+' : accountBadge}
        </span>
      ) : null}
    </Link>
  );

  return (
    <nav
      data-hub="insurance"
      aria-label="Main navigation"
      className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/90"
      style={{ borderColor: INSURANCE_BRAND.border }}
    >
      <div className="container mx-auto flex min-h-16 items-center justify-between gap-3 px-4 py-1 md:min-h-20">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <BrandLogo priority />
          <span
            className="hidden max-w-[7rem] text-[10px] font-semibold leading-tight tracking-wide xl:block"
            style={{ color: INSURANCE_BRAND.navy }}
          >
            {INSURANCE_LAYER_LABEL}
          </span>
        </div>

        <div className="hidden items-center gap-3 text-sm lg:flex xl:gap-4">
          {INSURANCE_HEADER_NAV.map((link) => (
            <Link
              key={link.href}
              prefetch={false}
              href={link.href}
              className={linkClass(link.href)}
              aria-current={navLinkActive(link.href, pathname) ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))}

          {myInsuranceBtn}

          <Button size="sm" variant="trust" asChild className="min-h-9 gap-2">
            <Link prefetch={false} href={INSURANCE_HEADER_CTA.href}>
              {INSURANCE_HEADER_CTA.label}
            </Link>
          </Button>

          <SwitchHubMenu />

          {signedIn ? (
            <button
              type="button"
              onClick={() => void handleSignOut()}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl px-2 text-xs font-semibold transition-colors"
              style={{ color: INSURANCE_BRAND.navy }}
              aria-label="Sign out"
            >
              <LogOut className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden xl:inline">Sign out</span>
            </button>
          ) : null}
        </div>

        {/* Mobile / tablet */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 lg:hidden">
          {myInsuranceBtn}
          <Button size="sm" variant="trust" asChild className="min-h-11 px-2.5 sm:px-3">
            <Link prefetch={false} href={INSURANCE_HEADER_CTA.href}>
              <span className="sm:hidden">Research</span>
              <span className="hidden sm:inline">{INSURANCE_HEADER_CTA.label}</span>
            </Link>
          </Button>
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0284C7]"
            style={{ color: INSURANCE_BRAND.navy }}
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
          className="max-h-[min(80vh,640px)] overflow-y-auto overscroll-contain border-t bg-white px-4 py-4 shadow-md lg:hidden"
          style={{ borderColor: INSURANCE_BRAND.border }}
        >
          <nav aria-label="Mobile navigation" className="flex flex-col gap-1 text-sm">
            <p
              className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: INSURANCE_BRAND.shield }}
            >
              {INSURANCE_LAYER_LABEL}
            </p>

            {INSURANCE_HEADER_NAV.map((link) => (
              <Link
                key={link.href}
                prefetch={false}
                href={link.href}
                className={cn(
                  'flex min-h-12 items-center rounded-lg px-2 font-semibold',
                  navLinkActive(link.href, pathname)
                    ? 'bg-[#E0F2FE] text-[#0284C7]'
                    : 'text-[#0A2540] hover:bg-[#E0F2FE]/50'
                )}
                aria-current={navLinkActive(link.href, pathname) ? 'page' : undefined}
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            <Link
              href="/my-insurance"
              className={cn(
                'mt-1 flex min-h-12 items-center gap-2 rounded-lg border px-3 font-semibold',
                navLinkActive('/my-insurance', pathname)
                  ? 'border-[#0284C7]/40 bg-[#E0F2FE]'
                  : 'border-[#E2E8F0] bg-white'
              )}
              style={{ color: INSURANCE_BRAND.navy }}
              onClick={() => setIsOpen(false)}
            >
              <Bookmark className="h-4 w-4" style={{ color: INSURANCE_BRAND.shield }} aria-hidden />
              My Insurance
              {showBadge ? (
                <span
                  className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold text-white tabular-nums"
                  style={{ backgroundColor: INSURANCE_BRAND.sapphire }}
                >
                  {accountBadge > 99 ? '99+' : accountBadge}
                </span>
              ) : null}
            </Link>

            <div className="mt-3 flex flex-col gap-2">
              <Button variant="trust" className="min-h-12 w-full" asChild>
                <Link
                  prefetch={false}
                  href={INSURANCE_HEADER_CTA.href}
                  onClick={() => setIsOpen(false)}
                >
                  {INSURANCE_HEADER_CTA.label}
                </Link>
              </Button>
              <SwitchHubMenu className="w-full [&_button]:w-full [&_button]:justify-center" />
            </div>

            {signedIn ? (
              <button
                type="button"
                className="mt-2 flex min-h-12 w-full items-center gap-2 rounded-lg px-2 text-left font-semibold"
                style={{ color: INSURANCE_BRAND.navy }}
                onClick={() => void handleSignOut()}
              >
                <LogOut className="h-4 w-4" aria-hidden />
                Sign out
              </button>
            ) : null}
          </nav>
        </div>
      ) : null}
    </nav>
  );
}
