/**
 * Network empty-inventory copy (Insurance first).
 * See docs/EMPTY-STATE-STANDARD.md
 */

export const EMPTY_INVENTORY_HONESTY =
  "We won't invent listings to fill this page.";

export const EMPTY_INVENTORY_FOOTER =
  "Research only · Not an endorsement · We don't invent listings";

/** States with live verified directory inventory (not a promise of every county). */
export const LIVE_DIRECTORY_STATES = new Set([
  'FL',
  'TX',
  'OH',
  'NV',
  'VT',
  'MA',
  'MS',
  'NJ',
  'NC',
]);

export type EmptyInventoryVariant = 'unmapped' | 'filtered';

export type EmptyInventoryCopy = {
  variant: EmptyInventoryVariant;
  headline: string;
  body: string;
  placeLabel?: string;
};

export function emptyInventoryHeadline(entities: string, placeOrFilters: string): string {
  return `No verified ${entities} match ${placeOrFilters} yet`;
}

export function emptyInventoryBody(variant: EmptyInventoryVariant): string {
  if (variant === 'unmapped') {
    return "We only publish research listings backed by official sources. Coverage is growing state by state and market by market. This view stays empty until that data is live and checked — we won't invent results.";
  }
  return "We only publish research listings backed by official sources. These filters are narrower than the data we have for this view. Try clearing specialty, widening filters, or opening a state or county hub — we won't invent results.";
}

export function classifyDirectoryEmpty(input: {
  zipRaw?: string;
  zipResolved: boolean;
  launchCounty: boolean;
  liveState: boolean;
}): EmptyInventoryVariant {
  if (input.zipRaw && !input.zipResolved) return 'unmapped';
  if (input.launchCounty || input.liveState) return 'filtered';
  return 'unmapped';
}

export function directoryEmptyCopy(input: {
  variant: EmptyInventoryVariant;
  zipRaw?: string;
  zipLabel?: string;
  state?: string;
  specialty?: string;
  query?: string;
}): EmptyInventoryCopy {
  const place =
    input.zipLabel ||
    (input.zipRaw ? `ZIP ${input.zipRaw}` : '') ||
    input.state ||
    input.query ||
    (input.specialty ? `${input.specialty} filters` : 'these filters');

  if (input.variant === 'unmapped') {
    return {
      variant: 'unmapped',
      headline: input.zipRaw
        ? `Verified agencies in ${place} aren't listed here yet`
        : emptyInventoryHeadline('agencies', place),
      body: input.zipRaw
        ? `We only publish agencies after official license checks. ${place} is outside current mapped inventory, or we do not have a live extract for that market yet. We're expanding from official sources — we won't invent listings.`
        : emptyInventoryBody('unmapped'),
      placeLabel: place,
    };
  }

  return {
    variant: 'filtered',
    headline: emptyInventoryHeadline('agencies', place),
    body: emptyInventoryBody('filtered'),
    placeLabel: place,
  };
}
