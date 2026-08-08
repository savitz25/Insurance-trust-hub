import { BadgeCheck, FileSearch, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { InsuranceVerificationDisplay } from '@/lib/insurance/verification-levels';
import { cn } from '@/lib/utils';

/**
 * Phase 6A — honest verification badge. Never “DOI Verified” without a number.
 */
export function InsuranceVerificationBadge({
  verification,
  className,
}: {
  verification: InsuranceVerificationDisplay;
  className?: string;
}) {
  if (verification.showLicenseVerifiedBadge) {
    return (
      <Badge variant="success" className={cn('gap-1', className)} title={verification.summary}>
        <BadgeCheck className="h-3 w-3" aria-hidden />
        {verification.badgeLabel}
      </Badge>
    );
  }
  if (verification.badgeVariant === 'located') {
    return (
      <Badge variant="secondary" className={cn('gap-1', className)} title={verification.summary}>
        <FileSearch className="h-3 w-3" aria-hidden />
        {verification.badgeLabel}
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className={cn('gap-1 font-normal', className)} title={verification.summary}>
      <Clock className="h-3 w-3" aria-hidden />
      {verification.badgeLabel}
    </Badge>
  );
}
