import Link from 'next/link';
import type { ContinueClusterResult } from '@/lib/providers/continue-cluster';

export function ContinueClusterResearch({
  cluster,
}: {
  cluster: ContinueClusterResult;
}) {
  if (!cluster.links.length) return null;
  return (
    <section aria-labelledby="continue-cluster-heading">
      <h2 id="continue-cluster-heading" className="text-xl font-semibold mb-3">
        {cluster.heading}
      </h2>
      <div className="rounded-xl border border-[#0284C7]/25 bg-[#E0F2FE]/35 p-5">
        <p className="text-sm text-muted-foreground leading-relaxed">
          Next research steps — educational tools and official lookups. This listing is not a
          recommendation or ranking.
        </p>
        <ul className="mt-3 flex flex-wrap gap-2">
          {cluster.links.map((l) => {
            const external = l.href.startsWith('http');
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  {...(external
                    ? { target: '_blank', rel: 'noopener noreferrer' }
                    : {})}
                  className="inline-flex min-h-10 items-center rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-[#0284C7] hover:border-[#0284C7]/40"
                >
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
