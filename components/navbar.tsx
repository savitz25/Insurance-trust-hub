'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { Bookmark, ChevronDown, LogOut, Menu, X } from 'lucide-react';
import { BrandLogo } from '@/components/BrandLogo';
import { SwitchHubMenu } from '@/components/switch-hub-menu';
import { useMyInsuranceOptional } from '@/components/my-insurance/my-insurance-provider';
import { listSavedProviderSlugsAction, signOutAction } from '@/actions/my-insurance';
import { INSURANCE_HEADER_NAV } from '@/lib/design/insurance-design-system';
import { navLinkActive } from '@/lib/nav/primary-nav';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PRIMARY_NAV = INSURANCE_HEADER_NAV.filter((item) =>
  ['Research', 'Marketplace', 'Medicare', 'Directory'].includes(item.label),
);
const MORE_NAV = INSURANCE_HEADER_NAV.filter((item) =>
  ['Guides', 'Data', 'Methodology'].includes(item.label),
);

/**
 * VISUAL-005 Insurance network shell — one sticky header, 69 / 65 / 57.
 */
export function Navbar() {
  const pathname = usePathname() || '/';
  const router = useRouter();
  const mi = useMyInsuranceOptional();
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [accountBadge, setAccountBadge] = useState(0);
  const drawerId = useId();
  const morePanelId = useId();
  const moreRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);

  const signedIn = Boolean(mi?.user);
  const authReady = !mi?.loading;
  const showBadge = authReady && signedIn && accountBadge > 0;

  useEffect(() => {
    setOpen(false);
    setMoreOpen(false);
  }, [pathname]);

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
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    menuRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!moreOpen) return;
    function onDoc(e: MouseEvent) {
      if (!moreRef.current?.contains(e.target as Node)) setMoreOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setMoreOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [moreOpen]);

  async function handleSignOut() {
    await signOutAction();
    await mi?.signOutLocal();
    setAccountBadge(0);
    toast.message('Signed out — research stays on this device');
    router.refresh();
    setOpen(false);
  }

  return (
    <header data-hub="insurance" className="th-header sticky top-0 z-50">
      <a href="#main-content" className="th-skip">
        Skip to content
      </a>
      <div className="th-header-inner th-shell">
        <BrandLogo />

        <nav aria-label="Primary" className="th-header-nav">
          {PRIMARY_NAV.map((item) => {
            const active = navLinkActive(item.href, pathname);
            return (
              <Link
                key={item.href}
                prefetch={false}
                href={item.href}
                className={cn('th-nav-link', active && 'th-nav-link-active')}
                aria-current={active ? 'page' : undefined}
              >
                {item.label}
              </Link>
            );
          })}
          <div ref={moreRef} className="relative">
            <button
              type="button"
              className={cn('th-nav-link', moreOpen && 'th-nav-link-active')}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
              aria-controls={morePanelId}
              onClick={() => setMoreOpen((v) => !v)}
            >
              More
              <ChevronDown
                className={cn('h-3.5 w-3.5 shrink-0 transition-transform', moreOpen && 'rotate-180')}
                aria-hidden
              />
            </button>
            {moreOpen ? (
              <div id={morePanelId} role="menu" className="th-network-panel absolute left-0 z-[80] mt-2 w-56">
                {MORE_NAV.map((item) => (
                  <Link
                    key={item.href}
                    prefetch={false}
                    href={item.href}
                    role="menuitem"
                    className="th-drawer-link"
                    onClick={() => setMoreOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            ) : null}
          </div>
        </nav>

        <div className="th-header-actions">
          <Link
            href="/my-insurance"
            aria-label={showBadge ? `My Insurance, ${accountBadge} saved agencies` : 'My Insurance'}
            title={
              signedIn
                ? 'My Insurance — coverage research HQ'
                : 'My Insurance — research passport (sign in optional on HQ)'
            }
            className="th-btn-secondary"
          >
            <Bookmark className="h-4 w-4 shrink-0" aria-hidden />
            My Insurance
            {showBadge ? (
              <span className="rounded-full bg-[#1E3A8A] px-1.5 py-0.5 text-[10px] font-semibold text-white tabular-nums">
                {accountBadge > 99 ? '99+' : accountBadge}
              </span>
            ) : null}
          </Link>
          <SwitchHubMenu />
        </div>

        <div className="th-header-mobile-actions">
          <Link
            href="/my-insurance"
            className="th-btn-icon"
            aria-label={showBadge ? `My Insurance, ${accountBadge} saved agencies` : 'My Insurance'}
          >
            <span className="relative">
              <Bookmark className="h-5 w-5" aria-hidden />
              {showBadge ? (
                <span className="absolute -right-2 -top-1 rounded-full bg-[#1E3A8A] px-1 text-[9px] font-semibold leading-none text-white tabular-nums">
                  {accountBadge > 99 ? '99+' : accountBadge}
                </span>
              ) : null}
            </span>
          </Link>
          <button
            ref={menuRef}
            type="button"
            className="th-btn-icon"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls={drawerId}
            aria-label={open ? 'Close menu' : 'Open menu'}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open ? (
        <>
          <button
            type="button"
            className="th-drawer-backdrop"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <div
            id={drawerId}
            className="th-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Insurance Trust Hub menu"
          >
            <nav aria-label="Mobile" className="flex flex-col">
              {INSURANCE_HEADER_NAV.map((item) => (
                <Link
                  key={item.href}
                  prefetch={false}
                  href={item.href}
                  className="th-drawer-link"
                  aria-current={navLinkActive(item.href, pathname) ? 'page' : undefined}
                  onClick={() => setOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <Link href="/carriers" prefetch={false} className="th-drawer-link" onClick={() => setOpen(false)}>
                Carriers
              </Link>
              <Link href="/my-insurance" className="th-drawer-link" onClick={() => setOpen(false)}>
                My Insurance
                {showBadge ? (
                  <span className="ml-2 rounded-full bg-[#1E3A8A] px-1.5 py-0.5 text-[10px] font-semibold text-white tabular-nums">
                    {accountBadge > 99 ? '99+' : accountBadge}
                  </span>
                ) : null}
              </Link>
              {signedIn ? (
                <button type="button" className="th-drawer-link w-full text-left" onClick={() => void handleSignOut()}>
                  <LogOut className="mr-2 h-4 w-4" aria-hidden />
                  Sign out
                </button>
              ) : null}
              <div className="mt-4 border-t border-[#E2E8F0] pt-4">
                <SwitchHubMenu variant="embedded" />
              </div>
            </nav>
          </div>
        </>
      ) : null}
    </header>
  );
}
