/**
 * Contextual journey handoffs (Insurance standalone).
 * Max 2 outbound links. Not for every profile card.
 */

export type LifeJourneyContext =
  | 'insurance-home'
  | 'insurance-renters'
  | 'insurance-destination';

export type LifeJourneyGeography = {
  state?: string;
  stateCode?: string;
  city?: string;
};

export type LifeJourneyLink = {
  href: string;
  label: string;
};

export type LifeJourneyContent = {
  label: string;
  body: string;
  links: LifeJourneyLink[];
};

const MOVE_VERIFY = 'https://www.movetrusthub.com/verify-dot';
const LENDER_DIR = 'https://www.lendertrusthub.com/local-lenders';

function placeLabel(geo?: LifeJourneyGeography): string | null {
  if (!geo) return null;
  if (geo.city && (geo.stateCode || geo.state)) {
    return `${geo.city}, ${geo.stateCode || geo.state}`;
  }
  if (geo.city) return geo.city;
  if (geo.state) return geo.state;
  return null;
}

function lenderHref(geo?: LifeJourneyGeography): string {
  const slug = geo?.state?.toLowerCase().replace(/\s+/g, '-');
  if (slug && /^[a-z-]+$/.test(slug) && slug.length > 1) {
    return `https://www.lendertrusthub.com/local-lenders/${slug}`;
  }
  return LENDER_DIR;
}

export function resolveLifeJourney(
  context: LifeJourneyContext,
  geography?: LifeJourneyGeography
): LifeJourneyContent {
  const place = placeLabel(geography);
  const label = 'Next in your journey';

  switch (context) {
    case 'insurance-home':
      return {
        label: 'Continue your research',
        body: place
          ? `Coverage research for ${place} stays on Insurance Trust Hub. Financing or a move is only the next step when that decision is already part of this journey.`
          : 'Coverage research stays on Insurance Trust Hub. Financing or a move is only the next step when that decision is already part of this journey.',
        links: [],
      };
    case 'insurance-renters':
      return {
        label,
        body: place
          ? `If you’re relocating to ${place}, research licensed movers before you sign a lease or book a truck.`
          : 'If you’re relocating, research licensed movers before you sign a lease or book a truck.',
        links: [{ href: MOVE_VERIFY, label: 'Research licensed movers' }],
      };
    case 'insurance-destination':
      return {
        label: 'Continue your research',
        body: place
          ? `Continue the same life event in ${place}. Return to your moving plan if you are relocating, or to lender research if you are still buying.`
          : 'Continue the same life event. Return to your moving plan if you are relocating, or to lender research if you are still buying.',
        links: [
          { href: MOVE_VERIFY, label: 'Return to your moving plan' },
          { href: lenderHref(geography), label: 'Continue your home-buying research' },
        ],
      };
    default: {
      const _exhaustive: never = context;
      return _exhaustive;
    }
  }
}
