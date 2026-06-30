import { Info } from 'lucide-react';
import { DISCLAIMER } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface DisclaimerBannerProps {
  className?: string;
  compact?: boolean;
}

export function DisclaimerBanner({ className, compact = false }: DisclaimerBannerProps) {
  return (
    <div
      className={cn(
        'border-y border-border/60 bg-muted/30',
        compact ? 'py-2.5' : 'py-3.5',
        className
      )}
      role="note"
      aria-label="Independence disclaimer"
    >
      <div className="container mx-auto px-4">
        <p
          className={cn(
            'flex items-start gap-2 text-muted-foreground leading-relaxed',
            compact ? 'text-[11px]' : 'text-xs md:text-sm'
          )}
        >
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-primary/70" aria-hidden="true" />
          <span>{DISCLAIMER}</span>
        </p>
      </div>
    </div>
  );
}