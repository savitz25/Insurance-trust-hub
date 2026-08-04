import Link from 'next/link';

/**
 * Hero protection chips — “What are you trying to protect?”
 * Links only to existing research routes (no quote CTAs).
 */
const PROTECT = [
  {
    label: 'My health',
    href: '/hubs/health-insurance',
    detail: 'Health hubs, ACA education, Medicare research',
  },
  {
    label: 'My home',
    href: '/resources/homeowners-insurance-basics',
    detail: 'Homeowners coverage research',
  },
  {
    label: 'My car',
    href: '/resources/auto-insurance-costs-by-state',
    detail: 'Auto insurance cost context by state',
  },
  {
    label: 'My family',
    href: '/tools/needs-assessment',
    detail: 'Educational needs assessment',
  },
  {
    label: 'I’m relocating',
    href: '/destinations',
    detail: 'Destination insurance guides + move context',
  },
] as const;

export function HeroProtectChips() {
  return (
    <nav aria-label="What are you trying to protect?" className="w-full">
      <ul className="flex flex-wrap items-center justify-center gap-2 sm:gap-2.5">
        {PROTECT.map((item) => (
          <li key={item.label}>
            <Link
              href={item.href}
              title={item.detail}
              className="inline-flex min-h-11 items-center rounded-full border border-border/80 bg-background px-4 py-2.5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-trust/40 hover:bg-trust/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-trust focus-visible:ring-offset-2"
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
