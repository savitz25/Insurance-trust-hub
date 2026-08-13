import Link from 'next/link';
import type { SeoCluster } from '@/lib/seo/seo-clusters';
import { clusterResearchLinks } from '@/lib/seo/seo-clusters';

/**
 * Phase 19 — compact research module on priority hubs.
 */
export function ResearchThisMarket({ cluster }: { cluster: SeoCluster }) {
  const links = clusterResearchLinks(cluster).filter((l) => l.href !== cluster.hubPath);
  return (
    <section
      className="rounded-xl border border-[#0284C7]/25 bg-[#E0F2FE]/40 p-5"
      aria-labelledby="research-this-market"
    >
      <h2 id="research-this-market" className="text-lg font-semibold text-[#0A2540]">
        Research this market
      </h2>
      <p className="mt-1 text-sm text-slate-600">
        Educational next steps for {cluster.marketName}. Official enrollment stays on .gov
        pathways. Agency listings appear only when verified.
      </p>
      <ul className="mt-3 flex flex-wrap gap-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="inline-flex min-h-10 items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#0284C7] hover:border-[#0284C7]/40"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
