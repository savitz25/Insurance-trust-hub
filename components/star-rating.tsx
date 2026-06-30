import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StarRatingProps {
  rating: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  showNumber?: boolean;
  className?: string;
}

export function StarRating({
  rating,
  max = 5,
  size = 'md',
  showNumber = true,
  className,
}: StarRatingProps) {
  const sizeClasses = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  const stars = Array.from({ length: max }, (_, i) => {
    const fill = Math.min(Math.max(rating - i, 0), 1);
    return { fill, index: i };
  });

  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <div className="flex items-center" aria-hidden="true">
        {stars.map((s) => (
          <span key={s.index} className="relative inline-block">
            <Star className={cn(sizeClasses[size], 'text-muted-foreground/30')} />
            {s.fill > 0 && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: `${s.fill * 100}%` }}
              >
                <Star className={cn(sizeClasses[size], 'star fill-current')} />
              </span>
            )}
          </span>
        ))}
      </div>
      {showNumber && (
        <span
          className={cn('font-semibold tabular-nums', size === 'lg' ? 'text-lg' : 'text-sm')}
          aria-label={`${rating.toFixed(1)} out of ${max} stars`}
        >
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  );
}