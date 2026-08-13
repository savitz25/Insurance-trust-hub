import Link from 'next/link';
import { getCachedVerifiedLaunchCounts } from '@/lib/directory/live-counts';
import { INSURANCE_BRAND } from '@/lib/design/insurance-design-system';

/**
 * Homepage live verified inventory chips. Hidden when a state count is 0.
 * Fail-soft: cached helper returns zeros and this renders nothing.
 */
export async function DirectoryLiveCounts() {
  const { fl, tx, oh, nc } = await getCachedVerifiedLaunchCounts();
  const rows = [
    {
      label: 'Florida (DFS)',
      href: '/directory?state=FL&verified=true',
      total: fl,
    },
    {
      label: 'Texas (TDI)',
      href: '/directory?state=TX&verified=true',
      total: tx,
    },
    {
      label: 'Ohio (ODI)',
      href: '/directory?state=OH&verified=true',
      total: oh,
    },
    {
      label: 'North Carolina (NC DOI)',
      href: '/directory?state=NC&verified=true',
      total: nc,
    },
  ].filter((row) => row.total > 0);

  if (!rows.length) return null;

  return (
    <ul className="mt-4 flex flex-wrap gap-2" aria-label="Verified agency inventory">
      {rows.map((row) => (
        <li key={row.href}>
          <Link
            href={row.href}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border bg-white px-4 py-2 text-sm font-semibold transition-colors hover:border-[#0284C7]/40 hover:bg-[#E0F2FE]/50"
            style={{ borderColor: INSURANCE_BRAND.border, color: INSURANCE_BRAND.ink }}
          >
            {row.label}
            <span className="tabular-nums opacity-80">{row.total.toLocaleString()}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
