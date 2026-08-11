import Link from 'next/link';
import { Shield } from 'lucide-react';
import { TrustMark } from '@/components/network/trust-mark';
import {
  ASK_NETWORK_OWNERSHIP_SHORT,
  ASK_NETWORK_STANDARD_URL,
} from '@/lib/network/standard-version';
import { cn } from '@/lib/utils';

/**
 * Single reusable network trust block — use once per page surface.
 */
export function NetworkResearchStandard({
  className,
  methodologyHref = '/methodology',
  compact = false,
}: {
  className?: string;
  methodologyHref?: string;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <p className={cn('text-xs leading-relaxed text-muted-foreground', className)}>
        <TrustMark variant="inline" />
        {' · '}
        {ASK_NETWORK_OWNERSHIP_SHORT}
        {' · '}
        <Link href={methodologyHref} className="font-medium text-primary hover:underline">
          Methodology
        </Link>
      </p>
    );
  }

  return (
    <aside
      className={cn(
        'rounded-xl border bg-muted/30 px-4 py-3.5 text-sm text-muted-foreground',
        className
      )}
      aria-label="Research standard"
    >
      <div className="flex items-start gap-2.5">
        <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
        <div className="min-w-0 space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/70">
            How this research works
          </p>
          <ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed">
            <li>We surface public and attributed sources for research — not a sales ranking.</li>
            <li>Directory order and research aids cannot be purchased.</li>
            <li>No paid placement. Contact requests (when offered) are not sold as lead inventory.</li>
          </ul>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
            <TrustMark />
            <Link
              href={methodologyHref}
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              Full methodology
            </Link>
            <a
              href={ASK_NETWORK_STANDARD_URL}
              className="font-medium text-primary underline-offset-2 hover:underline"
              rel="noopener noreferrer"
            >
              Network standard
            </a>
          </p>
        </div>
      </div>
    </aside>
  );
}
