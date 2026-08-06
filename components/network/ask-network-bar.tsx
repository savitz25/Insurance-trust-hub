'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { ASK_TRUST_HUB, NETWORK_HUBS } from '@/lib/network/ask-trust-hub';
import { networkHubHref, type HubLinkId } from '@/lib/network/handoff-href';
import { NetworkHandoffLink } from '@/components/network/network-handoff-link';

const HUB_HOME: Record<HubLinkId, string> = {
  move: '/my-move',
  insurance: '/my-insurance',
  lender: '/my-lending',
};

const HUB_BLURB: Record<HubLinkId, string> = {
  move: 'Moving directory · FMCSA research',
  insurance: 'Insurance research · plans & agents',
  lender: 'Lending research · NMLS lenders',
};

const ACTIVE_HUB: HubLinkId = 'insurance';

type HubLink = {
  id: string;
  shortLabel: string;
  proseName: string;
  blurb?: string;
  href: string;
  toHub: HubLinkId | null;
  nextPath?: string;
  active: boolean;
  sameOriginHandoff: boolean;
  external: boolean;
};

/**
 * Network family bar for Insurance Trust Hub.
 * Desktop: pills. Mobile: bottom sheet listing all three hubs (not a clipped “Network” menu).
 */
export function AskNetworkBar() {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, close]);

  const links: HubLink[] = [
    ...NETWORK_HUBS.map((h) => {
      const id = h.id as HubLinkId;
      const active = id === ACTIVE_HUB;
      const nextPath = HUB_HOME[id];
      return {
        id: h.id,
        shortLabel: h.shortLabel,
        proseName: h.proseName,
        blurb: HUB_BLURB[id],
        href: active ? h.url : networkHubHref(id, true, nextPath),
        toHub: id,
        nextPath,
        active,
        sameOriginHandoff: !active,
        external: active,
      };
    }),
    {
      id: 'standards',
      shortLabel: 'Standards',
      proseName: 'Ask Trust Hub Standards',
      blurb: 'Shared research standard · no paid placements',
      href: ASK_TRUST_HUB.methodologyUrl,
      toHub: null,
      nextPath: undefined,
      active: false,
      sameOriginHandoff: false,
      external: true,
    },
  ];

  return (
    <div className="relative z-[60] border-b border-border/70 bg-muted/40 text-[12px] text-muted-foreground">
      <div className="container mx-auto flex min-h-10 items-center justify-between gap-2 px-4 py-1.5">
        <a
          href={ASK_TRUST_HUB.url}
          className="inline-flex min-h-11 shrink-0 items-center font-semibold tracking-tight text-foreground/85 hover:text-foreground"
          rel="noopener noreferrer"
        >
          <span className="hidden sm:inline">Ask Trust Hub network</span>
          <span className="sm:hidden">Ask Trust Hub</span>
        </a>

        <nav aria-label="Ask Trust Hub network" className="hidden items-center gap-1 sm:flex">
          {links.map((link) =>
            link.active ? (
              <span
                key={link.id}
                className="rounded-md bg-background px-2.5 py-1.5 font-semibold text-foreground shadow-sm ring-1 ring-border/60"
                aria-current="page"
              >
                {link.shortLabel}
              </span>
            ) : link.sameOriginHandoff && link.toHub ? (
              <NetworkHandoffLink
                key={link.id}
                href={link.href}
                toHub={link.toHub}
                nextPath={link.nextPath}
                className="rounded-md px-2.5 py-1.5 font-medium hover:bg-background/80 hover:text-foreground"
              >
                {link.shortLabel}
              </NetworkHandoffLink>
            ) : (
              <a
                key={link.id}
                href={link.href}
                className="rounded-md px-2.5 py-1.5 font-medium hover:bg-background/80 hover:text-foreground"
                rel="noopener noreferrer"
              >
                {link.shortLabel}
              </a>
            )
          )}
        </nav>

        <div className="sm:hidden">
          <button
            type="button"
            className="inline-flex min-h-11 min-w-[7.5rem] items-center justify-center gap-1.5 rounded-md border border-border/80 bg-background px-3 py-2 text-sm font-semibold text-foreground shadow-sm"
            aria-expanded={open}
            aria-controls={menuId}
            aria-haspopup="dialog"
            onClick={() => setOpen((v) => !v)}
          >
            Switch hub
            <ChevronDown
              className={`h-4 w-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
              aria-hidden
            />
          </button>
        </div>
      </div>

      {open ? (
        <div className="sm:hidden">
          <button
            type="button"
            className="fixed inset-0 z-[100] bg-black/40"
            aria-label="Close hub switcher"
            onClick={close}
          />
          <div
            ref={panelRef}
            id={menuId}
            role="dialog"
            aria-modal="true"
            aria-label="Switch Trust Hub site"
            className="fixed inset-x-0 bottom-0 z-[110] max-h-[min(85vh,32rem)] overflow-y-auto rounded-t-2xl border border-border bg-background pb-[env(safe-area-inset-bottom)] shadow-2xl"
          >
            <div className="sticky top-0 flex items-start justify-between gap-3 border-b bg-background px-4 py-3">
              <div className="min-w-0">
                <p className="text-base font-semibold text-foreground">
                  All Trust Hub sites
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                  Same Ask Trust Hub account across Move, Insurance, and Lending.
                  You are on Insurance.
                </p>
              </div>
              <button
                type="button"
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-border text-foreground"
                aria-label="Close"
                onClick={close}
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>

            <ul className="p-2" role="list">
              {links.map((link) => {
                const rowClass = [
                  'flex min-h-[52px] w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors',
                  link.active
                    ? 'bg-primary/10 ring-1 ring-primary/25'
                    : 'hover:bg-muted active:bg-muted',
                ].join(' ');

                const body = (
                  <>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[15px] font-semibold text-foreground">
                          {link.proseName}
                        </span>
                        {link.active ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                            <Check className="h-3 w-3" aria-hidden />
                            You are here
                          </span>
                        ) : null}
                      </div>
                      {link.blurb ? (
                        <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
                          {link.blurb}
                        </p>
                      ) : null}
                    </div>
                  </>
                );

                if (link.active) {
                  return (
                    <li key={link.id}>
                      <div className={rowClass} aria-current="page">
                        {body}
                      </div>
                    </li>
                  );
                }

                if (link.sameOriginHandoff && link.toHub) {
                  return (
                    <li key={link.id}>
                      <NetworkHandoffLink
                        href={link.href}
                        toHub={link.toHub}
                        nextPath={link.nextPath}
                        className={rowClass}
                        onClick={close}
                      >
                        {body}
                      </NetworkHandoffLink>
                    </li>
                  );
                }

                return (
                  <li key={link.id}>
                    <a
                      href={link.href}
                      className={rowClass}
                      rel="noopener noreferrer"
                      onClick={close}
                    >
                      {body}
                    </a>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
