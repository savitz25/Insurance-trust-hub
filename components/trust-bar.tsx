import { TRUST_STATS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface TrustBarProps {
  className?: string;
}

export function TrustBar({ className }: TrustBarProps) {
  return (
    <section
      className={cn('trust-proof py-6', className)}
      aria-label="Trust statistics"
    >
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {TRUST_STATS.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-primary tracking-tight">
                {stat.value}
              </div>
              <div className="mt-1 text-xs md:text-sm text-muted-foreground font-medium uppercase tracking-wide">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}