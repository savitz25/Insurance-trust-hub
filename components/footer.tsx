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
 * Reverse text on navy; Shield Blue for interactive accents.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer
      data-hub="insurance"
      className="border-t border-white/10"
      style={{ backgroundColor: INSURANCE_BRAND.navy, color: INSURANCE_BRAND.white }}
    >
      <div className="container mx-auto px-4 py-12 sm:py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12">
          <div className="sm:col-span-2 lg:col-span-4">
            <div className="mb-4">
              <Link prefetch={false} href="/" className="inline-block">
                <BrandLogoStacked />
              </Link>
            </div>
            <p
              className="text-xs font-semibold uppercase tracking-[0.14em]"
              style={{ color: INSURANCE_BRAND.shield }}
            >
              {INSURANCE_LAYER_LABEL}
            </p>
            <p
              className="mt-2 max-w-md text-sm leading-relaxed"
              style={{ color: INSURANCE_BRAND.white }}
            >
              Independent research directory for licensed insurance agencies and coverage options.
              DOI-oriented verification signals. Not an insurer or agency — research tools only.
            </p>
            <p
              className="mt-3 text-xs leading-relaxed"
              style={{ color: INSURANCE_BRAND.onNavySoft }}
            >
              {INSURANCE_INDEPENDENCE_LINE}
            </p>
            <p className="mt-3 text-sm">
              <a
                href={`mailto:${SITE_EMAIL}`}
                className="font-semibold underline-offset-2 hover:underline"
                style={{ color: INSURANCE_BRAND.shield }}
              >
                {SITE_EMAIL}
              </a>
            </p>
          </div>

          <div className="lg:col-span-2">
            <h4
              className="mb-3 text-xs font-semibold uppercase tracking-[0.14em]"
              style={{ color: INSURANCE_BRAND.onNavySoft }}
            >
              Network
            </h4>
            <ul className="space-y-2.5 text-sm" style={{ color: INSURANCE_BRAND.white }}>
              {INSURANCE_NETWORK_LINKS.map((hub) => (
                <li key={hub.id}>
                  <a
                    href={hub.href}
                    className="transition-colors hover:text-[#0284C7]"
                    rel="noopener noreferrer"
                  >
                    {hub.label}
                  </a>
                </li>
              ))}
              <li>
                <a
                  href="https://www.asktrusthub.com/promise"
                  className="font-semibold transition-colors hover:underline"
                  style={{ color: INSURANCE_BRAND.shield }}
                  rel="noopener noreferrer"
                >
                  Independence Policy
                </a>
              </li>
            </ul>
          </div>

          {INSURANCE_FOOTER_COLUMNS.map((col) => (
            <div key={col.title} className="lg:col-span-2">
              <h4
                className="mb-3 text-xs font-semibold uppercase tracking-[0.14em]"
                style={{ color: INSURANCE_BRAND.onNavySoft }}
              >
                {col.title}
              </h4>
              <ul className="space-y-2.5 text-sm" style={{ color: INSURANCE_BRAND.white }}>
                {col.links.map((item) => (
                  <li key={item.href}>
                    {'external' in item && item.external ? (
                      <a
                        href={item.href}
                        className="transition-colors hover:text-[#0284C7]"
                        rel="noopener noreferrer"
                      >
                        {item.label}
                      </a>
                    ) : (
                      <Link
                        prefetch={false}
                        href={item.href}
                        className="transition-colors hover:text-[#0284C7]"
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

        <p
          className="mt-8 text-xs leading-relaxed"
          style={{ color: INSURANCE_BRAND.onNavySoft }}
        >
          {DISCLAIMER}
        </p>

        <div className="mt-8 border-t border-white/10 pt-8">
          <AskNetworkSeal />
        </div>

        <div
          className="mt-6 border-t border-white/10 pt-6 text-center text-xs"
          style={{ color: INSURANCE_BRAND.onNavyMuted }}
        >
          © {year} InsuranceTrustHub.com — Independent research · Expanding coverage · Zero paid
          placements
        </div>
      </div>
    </footer>
  );
}
