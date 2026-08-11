import {
  hasJourneyContext,
  orientationCopy,
  placeLabel,
  type JourneyContext,
} from '@/lib/network/journey-context';
import { cn } from '@/lib/utils';

export function JourneyOrientationBanner({
  context,
  className,
}: {
  context: JourneyContext;
  className?: string;
}) {
  if (!hasJourneyContext(context)) return null;
  const copy = orientationCopy(context);
  if (!copy) return null;
  const place = placeLabel(context);

  return (
    <div
      className={cn(
        'rounded-2xl border border-sky-200/80 bg-sky-50/60 px-4 py-4 sm:px-5',
        className
      )}
      data-journey-orientation="true"
      data-journey-src={context.src ?? ''}
      role="status"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-sky-900/80">
        {copy.eyebrow}
      </p>
      <p className="mt-1 text-lg font-bold text-foreground">{copy.title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{copy.body}</p>
      {place && context.intent ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Intent: {context.intent}
          {context.journey ? ` · Journey: ${context.journey}` : ''}
          {context.src ? ` · From: ${context.src}` : ''}
        </p>
      ) : null}
    </div>
  );
}
