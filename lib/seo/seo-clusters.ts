/**
 * Phase 19 — SEO compounding clusters around live inventory + flagship tools.
 * Do not invent thin city pages. Empty markets stay out of this map.
 */

export type SeoClusterLink = { href: string; label: string };

export type SeoCluster = {
  id: string;
  /** Hub registry slugs that belong to this cluster */
  hubSlugs: string[];
  /** Canonical consumer path (south-florida is not /hubs/florida/...) */
  hubPath: string;
  stateCode: string;
  marketName: string;
  queryFocus: string;
  title: string;
  description: string;
  h1: string;
  directoryHref: string;
  guides: SeoClusterLink[];
  sampleZips: Array<{ zip: string; label: string }>;
};

export const SEO_CLUSTERS: SeoCluster[] = [
  {
    id: 'south-florida',
    hubSlugs: ['miami-fort-lauderdale'],
    hubPath: '/hubs/south-florida',
    stateCode: 'FL',
    marketName: 'South Florida',
    queryFocus: 'licensed insurance agencies in South Florida',
    title: 'Licensed insurance agencies in South Florida | Florida DFS research',
    description:
      'Independent Florida DFS–verified agency research for Miami-Dade, Broward, and Palm Beach. License numbers you can re-check. Not a quote marketplace.',
    h1: 'Research licensed insurance agencies in South Florida',
    directoryHref: '/directory?state=FL&verified=true',
    guides: [
      { href: '/guides/miami-dade-aca-marketplace', label: 'Miami-Dade ACA guide' },
      { href: '/guides/broward-aca-marketplace', label: 'Broward ACA guide' },
      { href: '/guides/palm-beach-aca-marketplace', label: 'Palm Beach ACA guide' },
      { href: '/guides/florida-aca-marketplace', label: 'Florida ACA guide' },
    ],
    sampleZips: [
      { zip: '33139', label: 'Miami Beach' },
      { zip: '33301', label: 'Fort Lauderdale' },
      { zip: '33401', label: 'West Palm Beach' },
    ],
  },
  {
    id: 'jacksonville',
    hubSlugs: ['jacksonville'],
    hubPath: '/hubs/florida/jacksonville',
    stateCode: 'FL',
    marketName: 'Jacksonville',
    queryFocus: 'licensed insurance agencies in Jacksonville',
    title: 'Licensed insurance agencies in Jacksonville | Florida DFS research',
    description:
      'Independent Florida DFS–verified agency research for Jacksonville and Duval County. Re-check license status on official DFS tools. Not quotes or rankings.',
    h1: 'Research licensed insurance agencies in Jacksonville',
    directoryHref: '/directory?state=FL&verified=true',
    guides: [{ href: '/guides/florida-aca-marketplace', label: 'Florida ACA guide' }],
    sampleZips: [{ zip: '32202', label: 'Downtown Jacksonville' }],
  },
  {
    id: 'houston',
    hubSlugs: ['houston'],
    hubPath: '/hubs/texas/houston',
    stateCode: 'TX',
    marketName: 'Houston',
    queryFocus: 'licensed insurance agencies in Houston',
    title: 'Licensed insurance agencies in Houston | Texas TDI research',
    description:
      'Independent Texas TDI–verified agency research for Houston. Re-check licenses on official TDI tools. Educational research only — no paid placements.',
    h1: 'Research licensed insurance agencies in Houston',
    directoryHref: '/directory?state=TX&verified=true',
    guides: [
      { href: '/guides/houston-aca-marketplace', label: 'Houston ACA guide' },
      { href: '/guides/texas-aca-marketplace', label: 'Texas ACA guide' },
    ],
    sampleZips: [{ zip: '77002', label: 'Downtown Houston' }],
  },
  {
    id: 'dallas',
    hubSlugs: ['dallas-fort-worth'],
    hubPath: '/hubs/texas/dallas-fort-worth',
    stateCode: 'TX',
    marketName: 'Dallas–Fort Worth',
    queryFocus: 'licensed insurance agencies in Dallas',
    title: 'Licensed insurance agencies in Dallas–Fort Worth | Texas TDI research',
    description:
      'Independent Texas TDI–verified agency research for Dallas–Fort Worth. Re-check licenses on official TDI tools. Not a quote funnel.',
    h1: 'Research licensed insurance agencies in Dallas–Fort Worth',
    directoryHref: '/directory?state=TX&verified=true',
    guides: [
      { href: '/guides/dallas-aca-marketplace', label: 'Dallas ACA guide' },
      { href: '/guides/texas-aca-marketplace', label: 'Texas ACA guide' },
    ],
    sampleZips: [{ zip: '75201', label: 'Downtown Dallas' }],
  },
  {
    id: 'las-vegas',
    hubSlugs: ['las-vegas'],
    hubPath: '/hubs/nevada/las-vegas',
    stateCode: 'NV',
    marketName: 'Las Vegas',
    queryFocus: 'Las Vegas insurance agency license research',
    title: 'Las Vegas insurance agency license research | Nevada DOI',
    description:
      'Independent Nevada Division of Insurance (NV DOI)–verified firm research for Las Vegas and Clark County. Agencies/firms with a Nevada address. Re-check on official SBS tools.',
    h1: 'Research licensed insurance agencies in Las Vegas',
    directoryHref: '/directory?state=NV&verified=true',
    guides: [],
    sampleZips: [{ zip: '89101', label: 'Las Vegas' }],
  },
  {
    id: 'reno',
    hubSlugs: ['reno'],
    hubPath: '/hubs/nevada/reno',
    stateCode: 'NV',
    marketName: 'Reno',
    queryFocus: 'licensed insurance agencies in Reno',
    title: 'Licensed insurance agencies in Reno | Nevada DOI research',
    description:
      'Independent Nevada DOI–verified firm research for Reno / Washoe. Re-check licenses on official NV DOI / SBS tools. Small, honest inventory.',
    h1: 'Research licensed insurance agencies in Reno',
    directoryHref: '/directory?state=NV&verified=true',
    guides: [],
    sampleZips: [{ zip: '89501', label: 'Reno' }],
  },
  {
    id: 'columbus',
    hubSlugs: ['columbus'],
    hubPath: '/hubs/ohio/columbus',
    stateCode: 'OH',
    marketName: 'Columbus',
    queryFocus: 'licensed insurance agencies in Columbus',
    title: 'Licensed insurance agencies in Columbus | Ohio ODI research',
    description:
      'Independent Ohio Department of Insurance (ODI)–verified agency research for Columbus / Franklin. Agency/business entities only. Re-check on the official ODI locator.',
    h1: 'Research licensed insurance agencies in Columbus',
    directoryHref: '/directory?state=OH&verified=true',
    guides: [],
    sampleZips: [{ zip: '43215', label: 'Downtown Columbus' }],
  },
  {
    id: 'burlington',
    hubSlugs: ['burlington'],
    hubPath: '/hubs/vermont/burlington',
    stateCode: 'VT',
    marketName: 'Burlington',
    queryFocus: 'licensed insurance agencies in Burlington Vermont',
    title: 'Licensed insurance agencies in Burlington | Vermont DFR research',
    description:
      'Independent Vermont DFR–verified agency research for Burlington and Chittenden County. Small firm inventory. Re-check licenses on official VT DFR / SBS tools.',
    h1: 'Research licensed insurance agencies in Burlington',
    directoryHref: '/directory?state=VT&verified=true',
    guides: [],
    sampleZips: [{ zip: '05401', label: 'Burlington' }],
  },
];

const BY_SLUG = new Map<string, SeoCluster>();
const BY_PATH = new Map<string, SeoCluster>();
for (const c of SEO_CLUSTERS) {
  BY_PATH.set(c.hubPath, c);
  for (const slug of c.hubSlugs) BY_SLUG.set(slug, c);
}

export function clusterForHubSlug(hubSlug: string): SeoCluster | null {
  return BY_SLUG.get(hubSlug) ?? null;
}

export function clusterForPath(path: string): SeoCluster | null {
  return BY_PATH.get(path) ?? clusterForHubSlug(path.split('/').pop() || '');
}

export function isPrioritySitemapPath(urlPath: string): boolean {
  if (SEO_CLUSTERS.some((c) => urlPath.endsWith(c.hubPath) || urlPath.includes(c.hubPath))) {
    return true;
  }
  const flagships = [
    '/tools/marketplace-plan-research',
    '/calculators/aca-subsidy',
    '/tools/cost-estimator',
    '/data/plan-complaint-index',
    '/tools/license-verification',
    '/guides/florida-aca-marketplace',
    '/guides/miami-dade-aca-marketplace',
    '/guides/broward-aca-marketplace',
    '/guides/palm-beach-aca-marketplace',
    '/guides/houston-aca-marketplace',
    '/guides/texas-aca-marketplace',
  ];
  return flagships.some((p) => urlPath.endsWith(p));
}

export function clusterResearchLinks(cluster: SeoCluster): SeoClusterLink[] {
  return [
    ...cluster.guides,
    { href: cluster.directoryHref, label: `Verified ${cluster.stateCode} directory` },
    { href: '/tools/marketplace-plan-research', label: 'Marketplace plan research' },
    { href: '/calculators/aca-subsidy', label: 'ACA savings planner' },
    { href: '/tools/cost-estimator', label: 'Cost planner' },
    { href: '/tools/license-verification', label: 'License verification' },
    { href: '/data/plan-complaint-index', label: 'Complaint Index' },
    { href: '/methodology', label: 'Methodology' },
    { href: cluster.hubPath, label: `${cluster.marketName} hub` },
  ].filter((l, i, arr) => arr.findIndex((x) => x.href === l.href) === i);
}

export function marketplaceClusterChips(): SeoClusterLink[] {
  return [
    { href: '/hubs/south-florida', label: 'South Florida agencies' },
    { href: '/hubs/florida/jacksonville', label: 'Jacksonville agencies' },
    { href: '/hubs/texas/houston', label: 'Houston agencies' },
    { href: '/hubs/nevada/las-vegas', label: 'Las Vegas agencies' },
    { href: '/hubs/vermont/burlington', label: 'Burlington agencies' },
    { href: '/hubs/ohio/columbus', label: 'Columbus agencies' },
    { href: '/guides/florida-aca-marketplace', label: 'Florida ACA guide' },
    { href: '/guides/houston-aca-marketplace', label: 'Houston ACA guide' },
  ];
}
