import { ASK_TRUST_HUB, NETWORK_HUBS } from '@/lib/network/ask-trust-hub';
import { ASK_NETWORK_OWNERSHIP_SHORT } from '@/lib/network/standard-version';
import { TrustMark } from '@/components/network/trust-mark';
import { CrossHubLink } from '@/components/network/cross-hub-link';

/**
 * Footer network seal — common ownership + separated research (not unaffiliated).
 */
export function AskNetworkSeal() {
  return (
    <div className="mx-auto max-w-3xl px-4 text-center text-muted-foreground">
      <p className="text-sm font-semibold tracking-tight text-foreground">
        Part of the{' '}
        <a
          href={ASK_TRUST_HUB.url}
          className="underline underline-offset-2 hover:text-foreground/80"
          rel="noopener noreferrer"
        >
          Ask Trust Hub network
        </a>
      </p>
      <p className="mt-1.5 text-xs font-medium leading-relaxed text-foreground/80">
        {ASK_NETWORK_OWNERSHIP_SHORT}
      </p>
      <p className="mt-1 text-xs leading-relaxed">
        <a
          href={ASK_TRUST_HUB.promiseUrl}
          className="underline underline-offset-2 hover:opacity-90"
          rel="noopener noreferrer"
        >
          Independence policy
        </a>
        {' · '}
        <a
          href={ASK_TRUST_HUB.revenueUrl}
          className="underline underline-offset-2 hover:opacity-90"
          rel="noopener noreferrer"
        >
          How we make money
        </a>
        {' · '}
        <a href="/methodology" className="underline underline-offset-2 hover:opacity-90">
          Hub methodology
        </a>
      </p>
      <p className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <TrustMark />
      </p>
      <ul
        className="mt-3 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground/80"
        aria-label="Ask Trust Hub network sites"
      >
        <li>
          <a
            href={ASK_TRUST_HUB.url}
            className="underline-offset-2 hover:underline"
            rel="noopener noreferrer"
          >
            Ask Trust Hub
          </a>
          <span className="ml-1 opacity-70">(parent)</span>
        </li>
        {NETWORK_HUBS.map((hub) => (
          <li key={hub.id} className="flex items-center gap-1">
            <span className="opacity-40" aria-hidden>
              ·
            </span>
            {hub.id === 'insurance' ? (
              <span>
                {hub.proseName}
                <span className="ml-1 opacity-70">(you are here)</span>
              </span>
            ) : (
              <CrossHubLink
                href={hub.url}
                currentHub="insurance"
                className="underline-offset-2 hover:underline"
              >
                {hub.proseName}
              </CrossHubLink>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
