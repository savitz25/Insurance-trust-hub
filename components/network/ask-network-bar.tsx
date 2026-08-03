'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { ASK_TRUST_HUB, NETWORK_HUBS } from '@/lib/network/ask-trust-hub';

/**
 * Slim network bar above Insurance primary header (matches Move chrome).
 */
export function AskNetworkBar() {
  const [open, setOpen] = useState(false);

  const links = [
    ...NETWORK_HUBS.map((h) => ({
      id: h.id,
      label: h.shortLabel,
      href: h.url,
      active: h.id === 'insurance',
    })),
    {
      id: 'standards',
      label: 'Standards',
      href: ASK_TRUST_HUB.promiseUrl,
      active: false,
    },
  ];

  return (
    <div className="border-b border-border/70 bg-muted/30 text-[12px] text-muted-foreground">
      <div className="container mx-auto flex min-h-9 items-center justify-between gap-3 px-4 py-1.5 sm:min-h-10">
        <a
          href={ASK_TRUST_HUB.url}
          className="shrink-0 font-semibold tracking-tight text-foreground/80 hover:text-foreground"
          rel="noopener noreferrer"
        >
          <span className="hidden sm:inline">Ask Trust Hub Network</span>
          <span className="sm:hidden">Network</span>
        </a>

        <nav aria-label="Ask Trust Hub network" className="hidden items-center gap-1 sm:flex">
          {links.map((link) =>
            link.active ? (
              <span
                key={link.id}
                className="rounded-md bg-background px-2.5 py-1 font-semibold text-foreground shadow-sm ring-1 ring-border/60"
                aria-current="page"
              >
                {link.label}
              </span>
            ) : (
              <a
                key={link.id}
                href={link.href}
                className="rounded-md px-2.5 py-1 font-medium hover:bg-background/80 hover:text-foreground"
                rel="noopener noreferrer"
              >
                {link.label}
              </a>
            )
          )}
        </nav>

        <div className="relative sm:hidden">
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 font-medium"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            Network <ChevronDown className="h-3.5 w-3.5" aria-hidden />
          </button>
          {open ? (
            <div className="absolute right-0 top-full z-50 mt-1 min-w-[10rem] rounded-lg border bg-background py-1 shadow-md">
              {links.map((link) => (
                <a
                  key={link.id}
                  href={link.href}
                  className="block px-3 py-2 text-sm hover:bg-muted"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                  {link.active ? ' · you are here' : ''}
                </a>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
