'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState } from 'react';
import { Menu, X, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/directory', label: 'DIRECTORY' },
  { href: '/destinations', label: 'DESTINATIONS' },
  { href: '/resources', label: 'RESOURCES' },
  { href: '/tools', label: 'TOOLS' },
  { href: '/about', label: 'ABOUT' },
  { href: '/contact', label: 'Contact' },
] as const;

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        <div className="flex items-center gap-2 sm:gap-3">
          <Link prefetch={false} href="/" className="group">
            <Image
              src="/brand/insurance-trust-hub-logo.png"
              alt="Insurance Trust Hub — trusted insurance agency directory"
              width={280}
              height={56}
              priority
              fetchPriority="high"
              sizes="(max-width: 768px) 180px, 280px"
              className="h-12 w-auto transition-transform group-hover:scale-[1.02] max-w-[280px]"
            />
          </Link>
          <div className="hidden md:flex items-center rounded-full bg-trust/10 px-2 py-0.5 text-[9px] font-semibold tracking-[1px] text-trust border border-trust/20">
            TRUSTED
          </div>
        </div>

        <div className="hidden lg:flex items-center gap-7 text-sm">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              prefetch={false}
              href={link.href}
              className={cn(
                'font-medium text-muted-foreground hover:text-foreground transition-colors relative',
                'after:absolute after:bottom-[-2px] after:left-0 after:h-px after:w-0 after:bg-foreground after:transition-all hover:after:w-full',
                link.label === 'Contact' ? 'normal-case' : 'uppercase tracking-wide text-xs'
              )}
            >
              {link.label}
            </Link>
          ))}
          <Button size="sm" asChild className="gap-2 shadow-sm">
            <Link href="/contact">
              <Phone className="h-4 w-4" aria-hidden="true" />
              Get Quotes
            </Link>
          </Button>
        </div>

        <div className="flex lg:hidden items-center gap-2">
          <Button size="sm" asChild className="min-h-[44px] px-3">
            <Link href="/contact">Quotes</Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 min-h-[44px] min-w-[44px]"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {isOpen && (
        <div className="lg:hidden border-t bg-background px-4 py-4">
          <div className="flex flex-col gap-1 text-sm">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                prefetch={false}
                href={link.href}
                className="py-3 min-h-[44px] flex items-center font-medium text-muted-foreground hover:text-foreground"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            <Button className="w-full mt-2 min-h-[48px]" asChild>
              <Link href="/contact" onClick={() => setIsOpen(false)}>
                Get Free Quotes
              </Link>
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}