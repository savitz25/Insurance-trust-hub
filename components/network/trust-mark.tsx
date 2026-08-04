import { ASK_TRUST_HUB } from '@/lib/network/ask-trust-hub';
import { cn } from '@/lib/utils';

type TrustMarkProps = {
  className?: string;
  variant?: 'chip' | 'text';
};

/** Links to Ask methodology — network product signal. */
export function TrustMark({ className, variant = 'chip' }: TrustMarkProps) {
  if (variant === 'text') {
    return (
      <a
        href={ASK_TRUST_HUB.methodologyUrl}
        className={cn(
          'text-xs font-medium text-muted-foreground underline-offset-2 hover:underline',
          className
        )}
        rel="noopener noreferrer"
      >
        Researched to the Ask Trust Hub Standard
      </a>
    );
  }

  return (
    <a
      href={ASK_TRUST_HUB.methodologyUrl}
      className={cn(
        'inline-flex items-center rounded-full border border-border/70 bg-muted/40 px-2.5 py-0.5',
        'text-[11px] font-semibold tracking-wide text-muted-foreground',
        'transition-colors hover:border-primary/30 hover:text-foreground',
        className
      )}
      rel="noopener noreferrer"
    >
      Ask Trust Hub Standard
    </a>
  );
}
