/**
 * Consumer-safe secondary signals (Google / BBB snapshots).
 * Kept separate from the admin enrichment pipeline so provider pages never
 * import service-role / admin session modules.
 */

import type { Provider } from '@/types/provider';
import type { PublicSecondarySignals } from '@/lib/enrichment/types';
import { SECONDARY_SIGNALS_DISCLAIMER as DISCLAIMER } from '@/lib/enrichment/types';
import { isEligibleForSecondaryEnrichment } from '@/lib/enrichment/eligibility';
import { isPlaceholderPhone } from '@/lib/provenance/phone';

function formatDate(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function toPublicSecondarySignals(
  provider: Provider
): PublicSecondarySignals | null {
  const elig = isEligibleForSecondaryEnrichment(provider);
  if (!elig.eligible) return null;

  const enr = provider.enrichment ?? {};
  const g = enr.google;
  const b = enr.bbb;

  const google =
    g && g.matchConfidence === 'high'
      ? {
          rating: g.rating ?? null,
          reviewCount: g.reviewCount ?? null,
          mapsUrl: g.mapsUrl ?? null,
          website: g.website ?? null,
          checkedAtLabel: formatDate(g.checkedAt),
          businessStatus: g.businessStatus ?? null,
        }
      : null;

  const bbb =
    b && (b.matchConfidence === 'high' || b.matchConfidence === 'medium')
      ? {
          rating: b.rating ?? null,
          accredited: b.accredited ?? null,
          profileUrl: b.profileUrl ?? null,
          checkedAtLabel: formatDate(b.checkedAt),
        }
      : null;

  if (!google && !bbb) return null;

  if (google && g?.formattedPhone && isPlaceholderPhone(g.formattedPhone)) {
    // phone not exposed on public secondary object
  }

  return {
    google,
    bbb,
    disclaimer: DISCLAIMER,
  };
}
