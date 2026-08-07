import Link from 'next/link';
import { BrandLogoStacked } from '@/components/BrandLogo';
import { AskNetworkSeal } from '@/components/network/ask-network-seal';
import {
  INSURANCE_BRAND,
  INSURANCE_FOOTER_COLUMNS,
  INSURANCE_INDEPENDENCE_LINE,
  INSURANCE_LAYER_LABEL,
  INSURANCE_NETWORK_LINKS,
} from '@/lib/design/insurance-design-system';
import { DISCLAIMER, SITE_EMAIL } from '@/lib/constants';

/**
 * Insurance footer — Phase 1: navy, network hubs, independence, legal.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      data-hub="insurance"
      className="border-t border-white/10 text-slate-200"
      style={{ backgroundColor: INSURANCE_BRAND.navy }}
    >
      <div className="container mx-auto px-4 py-12 sm:py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12">
          <div className="sm:col-span-2 lg:col-span-4">
            <div className="mb-4">
              <Link prefetch={false} href="/" className="inline-block">
                <BrandLogoStacked />
              </Link>
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7DD3FC]">
              {INSURANCE_LAYER_LABEL}
            </p>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-slate-300">
              Independent research directory for licensed insurance agencies and coverage options.
              DOI-oriented verification signals. Not an insurer or agency — research tools only.
            </p>
            <p className="mt-3 text-xs leading-relaxed text-slate-400">
              {INSURANCE_INDEPENDENCE_LINE}
            </p>
            <p className="mt-3 text-sm">
              <a
                href={`mailto:${SITE_EMAIL}`}
                className="font-medium text-[#7DD3FC] underline-offset-2 hover:text-white hover:underline"
              >
                {SITE_EMAIL}
              </a>
            </p>
          </div>

          <div className="lg:col-span-2">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
              Network
            </h4>
            <ul className="space-y-2.5 text-sm text-slate-300">
              {INSURANCE_NETWORK_LINKS.map((hub) => (
                <li key={hub.id}>
                  <a
                    href={hub.href}
                    className="transition-colors hover:text-white"
                    rel="noopener noreferrer"
                  >
                    {hub.label}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="https://www.asktrusthub.com/promise"
                  className="font-medium text-[#7DD3FC] transition-colors hover:text-white"
                  rel="noopener noreferrer"
                >
                  Independence Policy
                </a>
              </li>
            </ul>
          </div>

          {INSURANCE_FOOTER_COLUMNS.map((col) => (
            <div key={col.title} className="lg:col-span-2">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                {col.title}
              </h4>
              <ul className="space-y-2.5 text-sm text-slate-300">
                {col.links.map((item) => (
                  <li key={item.href}>
                    {'external' in item && item.external ? (
                      <a
                        href={item.href}
                        className="transition-colors hover:text-white"
                        rel="noopener noreferrer"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <Link
                        prefetch={false}
                        href={item.href}
                        className="transition-colors hover:text-white"
                      >
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-8 text-xs leading-relaxed text-slate-400">{DISCLAIMER}</p>

        <div className="mt-8 border-t border-white/10 pt-8">
          <AskNetworkSeal />
        </div>

        <div className="mt-6 border-t border-white/10 pt-6 text-center text-xs text-slate-500">
          © {year} InsuranceTrustHub.com — Independent research · Expanding coverage · Zero paid
          placements
        </div>
      </div>
    </footer>
  );
}
