import Link from 'next/link';
import { getCachedVerifiedLaunchCounts } from '@/lib/directory/live-counts';
import { isReadyCount } from '@/lib/dfs/provider-count';
import { HeadCountValue } from '@/components/head-count-value';
import { INSURANCE_BRAND } from '@/lib/design/insurance-design-system';

/**
 * Homepage live verified inventory chips. Hidden when a state count is 0.
 * Fail-soft: cached helper returns zeros and this renders nothing.
 */
export async function DirectoryLiveCounts() {
  let loaded;
  try {
    loaded = await getCachedVerifiedLaunchCounts();
  } catch {
    return <p className="mt-4 text-sm text-muted-foreground">count temporarily unavailable</p>;
  }
  const { fl, tx, oh, nc, nv, vt, ma, ms } = loaded;
  const rows = [
    {
      label: 'Florida (DFS)',
      href: '/directory?state=FL&verified=true',
      count: fl,
      total: isReadyCount(fl) ? fl.value : 0,
    },
    {
      label: 'Texas (TDI)',
      href: '/directory?state=TX&verified=true',
      count: tx,
      total: isReadyCount(tx) ? tx.value : 0,
    },
    {
      label: 'Ohio (ODI)',
      href: '/directory?state=OH&verified=true',
      count: oh,
      total: isReadyCount(oh) ? oh.value : 0,
    },
    {
      label: 'North Carolina (NC DOI)',
      href: '/directory?state=NC&verified=true',
      count: nc,
      total: isReadyCount(nc) ? nc.value : 0,
    },
    {
      label: 'Nevada (NV DOI)',
      href: '/directory?state=NV&verified=true',
      count: nv,
      total: isReadyCount(nv) ? nv.value : 0,
    },
    {
      label: 'Vermont (VT DFR)',
      href: '/directory?state=VT&verified=true',
      count: vt,
      total: isReadyCount(vt) ? vt.value : 0,
    },
    {
      label: 'Massachusetts (MA DOI)',
      href: '/directory?state=MA&verified=true',
      count: ma,
      total: isReadyCount(ma) ? ma.value : 0,
    },
    {
      label: 'Mississippi (MID)',
      href: '/directory?state=MS&verified=true',
      count: ms,
      total: isReadyCount(ms) ? ms.value : 0,
    },
  ].filter((row) => row.total > 0);

  if (!rows.length) {
    const counts = [fl, tx, oh, nc, nv, vt, ma, ms];
    if (counts.some((count) => !isReadyCount(count))) {
      return <p className="mt-4 text-sm text-muted-foreground">count temporarily unavailable</p>;
    }
    return null;
  }

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
            <span className="opacity-80">
              <HeadCountValue count={row.count} />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
