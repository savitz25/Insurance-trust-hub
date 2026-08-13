import Link from 'next/link';
import { getCachedVerifiedLaunchCounts } from '@/lib/directory/live-counts';
import { LIVE_LAUNCH_HUBS } from '@/lib/product/research-ia';
import { INSURANCE_BRAND } from '@/lib/design/insurance-design-system';

/**
 * Phase 18 — deep-link live launch hubs only when that state has verified inventory.
 */
export async function LiveLaunchHubs() {
  const counts = await getCachedVerifiedLaunchCounts();
  const rows = LIVE_LAUNCH_HUBS.filter((hub) => {
    const n = counts[hub.state.toLowerCase() as keyof typeof counts];
    return typeof n === 'number' && n > 0;
  });
  if (!rows.length) return null;

  return (
    <div className="mt-6">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Live verified hubs
      </p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {rows.map((hub) => (
          <li key={hub.href}>
            <Link
              href={hub.href}
              className="inline-flex min-h-11 items-center rounded-full border bg-white px-4 py-2 text-sm font-semibold transition-colors hover:border-[#0284C7]/40 hover:bg-[#E0F2FE]/50"
              style={{ borderColor: INSURANCE_BRAND.border, color: INSURANCE_BRAND.ink }}
            >
              {hub.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
