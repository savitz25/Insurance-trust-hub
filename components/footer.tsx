import Link from 'next/link';
import { BrandLogoStacked } from '@/components/BrandLogo';
import { DISCLAIMER, MOVE_TRUST_HUB_URL, SITE_EMAIL, SITE_NAME } from '@/lib/constants';

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t bg-muted/20">
      <div className="container mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-y-9">
          <div className="col-span-2 md:col-span-1">
            <Link prefetch={false} href="/" className="inline-block">
              <BrandLogoStacked />
            </Link>
            <p className="mt-2.5 text-sm text-muted-foreground max-w-[220px] leading-snug">
              Independent directory for licensed insurance agencies nationwide.
            </p>
          </div>

          <div>
            <div className="font-semibold mb-2.5 text-xs tracking-widest text-muted-foreground/80">
              DIRECTORY
            </div>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              <div><Link prefetch={false} href="/directory" className="hover:text-foreground transition-colors">All Agents</Link></div>
              <div><Link prefetch={false} href="/hubs" className="hover:text-foreground transition-colors">Health Insurance Hubs</Link></div>
              <div><Link prefetch={false} href="/hubs/browse" className="hover:text-foreground transition-colors">State &amp; MSA Browser</Link></div>
              <div><Link prefetch={false} href="/calculators" className="hover:text-foreground transition-colors">Calculators</Link></div>
            </div>
          </div>

          <div>
            <div className="font-semibold mb-2.5 text-xs tracking-widest text-muted-foreground/80">
              DESTINATIONS
            </div>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              <div><Link prefetch={false} href="/destinations" className="hover:text-foreground transition-colors">All States</Link></div>
              <div><Link prefetch={false} href="/destinations/florida" className="hover:text-foreground transition-colors">Florida</Link></div>
              <div><Link prefetch={false} href="/destinations/texas" className="hover:text-foreground transition-colors">Texas</Link></div>
              <div><Link prefetch={false} href="/destinations/california" className="hover:text-foreground transition-colors">California</Link></div>
              <div><Link prefetch={false} href="/destinations/new-york" className="hover:text-foreground transition-colors">New York</Link></div>
            </div>
          </div>

          <div>
            <div className="font-semibold mb-2.5 text-xs tracking-widest text-muted-foreground/80">
              RESOURCES
            </div>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              <div><Link prefetch={false} href="/resources" className="hover:text-foreground transition-colors">All Guides</Link></div>
              <div><Link prefetch={false} href="/resources/how-to-choose-insurance-agent" className="hover:text-foreground transition-colors">Choosing Health Insurance 2026</Link></div>
              <div><Link prefetch={false} href="/resources/avoiding-coverage-gaps" className="hover:text-foreground transition-colors">Scam Avoidance</Link></div>
              <div><Link prefetch={false} href="/tools/license-verification" className="hover:text-foreground transition-colors">State DOI Links</Link></div>
              <div><Link prefetch={false} href="/resources/auto-insurance-costs-by-state" className="hover:text-foreground transition-colors">Auto Insurance Costs</Link></div>
              <div><Link prefetch={false} href="/resources/homeowners-insurance-basics" className="hover:text-foreground transition-colors">Homeowners Basics</Link></div>
              <div><Link prefetch={false} href="/tools/cost-estimator" className="hover:text-foreground transition-colors">Cost Estimator</Link></div>
            </div>
          </div>

          <div>
            <div className="font-semibold mb-2.5 text-xs tracking-widest text-muted-foreground/80">
              COMPANY &amp; LEGAL
            </div>
            <div className="space-y-1.5 text-sm text-muted-foreground">
              <div><Link prefetch={false} href="/about" className="hover:text-foreground transition-colors">About Us</Link></div>
              <div><Link prefetch={false} href="/contact" className="hover:text-foreground transition-colors">Contact</Link></div>
              <div><Link prefetch={false} href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link></div>
              <div><Link prefetch={false} href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link></div>
              <div><Link prefetch={false} href="/about#disclaimer" className="hover:text-foreground transition-colors">Disclaimer</Link></div>
            </div>
          </div>

          <div className="col-span-2 md:col-span-1 text-sm text-muted-foreground">
            <div className="font-semibold mb-2 text-xs tracking-widest text-muted-foreground/80">
              TRUST NETWORK
            </div>
            <p className="leading-snug text-[13px]">
              Part of the Trust Hub family. Also explore{' '}
              <a
                href={MOVE_TRUST_HUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-primary hover:underline underline-offset-2"
              >
                Move Trust Hub
              </a>{' '}
              for licensed interstate movers.
            </p>
            <p className="mt-2.5 text-[13px]">
              <a href={`mailto:${SITE_EMAIL}`} className="hover:text-foreground transition-colors">
                {SITE_EMAIL}
              </a>
            </p>
            <div className="mt-3 text-[11px] text-muted-foreground/70">
              © {year} {SITE_NAME}
            </div>
          </div>
        </div>
      </div>

      <div className="border-t py-5">
        <p className="container mx-auto px-4 text-center text-[10px] text-muted-foreground/70 tracking-wide leading-relaxed max-w-4xl">
          {DISCLAIMER}
        </p>
      </div>
    </footer>
  );
}