import Link from 'next/link';
import { BrandLogoStacked } from '@/components/BrandLogo';
import { AskNetworkSeal } from '@/components/network/ask-network-seal';
import { DISCLAIMER, SITE_EMAIL, SITE_NAME } from '@/lib/constants';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/20">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-2 gap-y-9 md:grid-cols-6">
          <div className="col-span-2 md:col-span-1">
            <Link prefetch={false} href="/" className="inline-block">
              <BrandLogoStacked />
            </Link>
            <p className="mt-2.5 max-w-[220px] text-sm leading-snug text-muted-foreground">
              Independent research directory for licensed insurance agencies. No paid placements.
            </p>
          </div>

          <div>
            <div className="mb-2.5 text-xs font-semibold tracking-widest text-muted-foreground/80">
              DIRECTORY
            </div>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              <div>
                <Link
                  prefetch={false}
                  href="/directory"
                  className="transition-colors hover:text-foreground"
                >
                  All Agents
                </Link>
              </div>
              <div>
                <Link
                  prefetch={false}
                  href="/hubs"
                  className="transition-colors hover:text-foreground"
                >
                  Health Insurance Hubs
                </Link>
              </div>
              <div>
                <Link
                  prefetch={false}
                  href="/hubs/browse"
                  className="transition-colors hover:text-foreground"
                >
                  State &amp; MSA Browser
                </Link>
              </div>
              <div>
                <Link
                  prefetch={false}
                  href="/calculators"
                  className="transition-colors hover:text-foreground"
                >
                  Calculators
                </Link>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2.5 text-xs font-semibold tracking-widest text-muted-foreground/80">
              DESTINATIONS
            </div>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              <div>
                <Link
                  prefetch={false}
                  href="/destinations"
                  className="transition-colors hover:text-foreground"
                >
                  All States
                </Link>
              </div>
              <div>
                <Link
                  prefetch={false}
                  href="/destinations/florida"
                  className="transition-colors hover:text-foreground"
                >
                  Florida
                </Link>
              </div>
              <div>
                <Link
                  prefetch={false}
                  href="/destinations/texas"
                  className="transition-colors hover:text-foreground"
                >
                  Texas
                </Link>
              </div>
              <div>
                <Link
                  prefetch={false}
                  href="/destinations/california"
                  className="transition-colors hover:text-foreground"
                >
                  California
                </Link>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2.5 text-xs font-semibold tracking-widest text-muted-foreground/80">
              RESOURCES
            </div>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              <div>
                <Link
                  prefetch={false}
                  href="/my-insurance"
                  className="transition-colors hover:text-foreground"
                >
                  My Insurance
                </Link>
              </div>
              <div>
                <Link
                  prefetch={false}
                  href="/resources"
                  className="transition-colors hover:text-foreground"
                >
                  All Guides
                </Link>
              </div>
              <div>
                <Link
                  prefetch={false}
                  href="/tools/license-verification"
                  className="transition-colors hover:text-foreground"
                >
                  License Verification
                </Link>
              </div>
              <div>
                <Link
                  prefetch={false}
                  href="/tools/cost-estimator"
                  className="transition-colors hover:text-foreground"
                >
                  Cost &amp; Coverage Planner
                </Link>
              </div>
            </div>
          </div>

          <div>
            <div className="mb-2.5 text-xs font-semibold tracking-widest text-muted-foreground/80">
              COMPANY &amp; LEGAL
            </div>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              <div>
                <Link
                  prefetch={false}
                  href="/about"
                  className="transition-colors hover:text-foreground"
                >
                  About Us
                </Link>
              </div>
              <div>
                <Link
                  prefetch={false}
                  href="/methodology"
                  className="transition-colors hover:text-foreground"
                >
                  Methodology
                </Link>
              </div>
              <div>
                <Link
                  prefetch={false}
                  href="/contact"
                  className="transition-colors hover:text-foreground"
                >
                  Contact
                </Link>
              </div>
              <div>
                <Link
                  prefetch={false}
                  href="/privacy"
                  className="transition-colors hover:text-foreground"
                >
                  Privacy Policy
                </Link>
              </div>
              <div>
                <Link
                  prefetch={false}
                  href="/terms"
                  className="transition-colors hover:text-foreground"
                >
                  Terms of Service
                </Link>
              </div>
              <div>
                <Link
                  prefetch={false}
                  href="/about#disclaimer"
                  className="transition-colors hover:text-foreground"
                >
                  Disclaimer
                </Link>
              </div>
            </div>
          </div>

          <div className="col-span-2 text-sm text-muted-foreground md:col-span-1">
            <div className="mb-2 text-xs font-semibold tracking-widest text-muted-foreground/80">
              CONTACT
            </div>
            <p className="text-[13px] leading-snug">
              <a
                href={`mailto:${SITE_EMAIL}`}
                className="transition-colors hover:text-foreground"
              >
                {SITE_EMAIL}
              </a>
            </p>
            <div className="mt-3 text-[11px] text-muted-foreground/70">
              © {year} {SITE_NAME}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t py-6">
        <AskNetworkSeal />
      </div>

      <div className="border-t py-5">
        <p className="container mx-auto max-w-4xl px-4 text-center text-[10px] leading-relaxed tracking-wide text-muted-foreground/70">
          {DISCLAIMER}
        </p>
      </div>
    </footer>
  );
}
