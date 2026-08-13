import Link from 'next/link';
import { BookOpen, ExternalLink, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HubMatchFormProps {
  hubName: string;
  /** When false, omit any soft path that implies local agent contact capacity */
  hasVerifiedListings?: boolean;
  directoryHref?: string;
}

/**
 * Phase 0 — research pathways only.
 * No ZIP+email quote funnels, no “we’ll have someone contact you” lead language.
 */
export function HubMatchForm({
  hubName,
  hasVerifiedListings = false,
  directoryHref = '/directory?verified=true',
}: HubMatchFormProps) {
  return (
    <div className="rounded-xl border bg-card p-5 shadow-trust space-y-3">
      <h3 className="font-semibold text-foreground flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-primary" aria-hidden />
        Research {hubName}
      </h3>
      <p className="text-xs text-muted-foreground leading-relaxed">
        Independent research tools — not a quote marketplace. No paid placements and no lead fees.
        Official enrollment stays on government or licensed-agent channels you choose.
      </p>
      <div className="flex flex-col gap-2">
        <Button asChild variant="trust" className="w-full justify-start">
          <Link href="/tools/license-verification">
            <ShieldCheck className="h-4 w-4 mr-2" aria-hidden />
            License verification
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full justify-start">
          <Link href="/tools/marketplace-plan-research">Marketplace plan research</Link>
        </Button>
        <Button asChild variant="outline" className="w-full justify-start">
          <Link href="/calculators/aca-subsidy">Estimate ACA savings</Link>
        </Button>
        <Button asChild variant="outline" className="w-full justify-start">
          <Link href="/tools/cost-estimator">Estimate annual cost</Link>
        </Button>
        <Button asChild variant="outline" className="w-full justify-start">
          <a
            href="https://www.healthcare.gov"
            target="_blank"
            rel="noopener noreferrer"
          >
            HealthCare.gov
            <ExternalLink className="h-3.5 w-3.5 ml-2" aria-hidden />
          </a>
        </Button>
        {hasVerifiedListings ? (
          <Button asChild variant="ghost" className="w-full justify-start text-xs">
            <Link href={directoryHref}>Browse verified research listings</Link>
          </Button>
        ) : (
          <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">
            We’re still verifying agencies in this market. No verified local listings are shown yet.
          </p>
        )}
      </div>
    </div>
  );
}
