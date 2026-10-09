import Link from 'next/link';
import { getHubsByState } from '@/lib/hubs/registry';

/**
 * Server HTML links from a statewide page to the county and metro hubs the
 * sitemap publishes. getHubsByState reads the same registry the sitemap emits
 * at /hubs/{stateSlug} and /hubs/{stateSlug}/{hub.slug}.
 * New Jersey already links its hub index from the state page and does not mount this.
 */
export function StateHubLinks({ stateSlug }: { stateSlug: string }) {
  const hubs = getHubsByState(stateSlug);
  if (hubs.length === 0) return null;

  const stateName = hubs[0]?.stateName ?? stateSlug;
  const headingId = `${stateSlug}-county-metro-hubs`;

  return (
    <section aria-labelledby={headingId} className="mt-10 border-t border-slate-200 pt-8" data-state-hub-links={stateSlug}>
      <h2 id={headingId} className="text-lg font-semibold text-[#0A2540]">
        {`${stateName} county and metro hubs`}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
        Published agency research hubs. These pages are not this statewide regulatory snapshot.
      </p>
      <ul className="mt-3 space-y-2 text-sm">
        <li>
          <Link href={`/hubs/${stateSlug}`} className="font-medium text-[#0284C7] underline underline-offset-2">
            {`${stateName} hubs`}
          </Link>
        </li>
        {hubs.map((hub) => (
          <li key={hub.slug}>
            <Link
              href={`/hubs/${stateSlug}/${hub.slug}`}
              className="font-medium text-[#0284C7] underline underline-offset-2"
            >
              {hub.shortName}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
