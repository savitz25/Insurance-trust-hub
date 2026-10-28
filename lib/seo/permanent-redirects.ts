/** Sources that next.config.ts redirects permanently. Keep them out of the sitemap. */
export const PERMANENT_REDIRECTS: ReadonlyArray<{
  source: string;
  destination: string;
}> = [
  { source: '/privacy-policy', destination: '/privacy' },
  { source: '/terms-of-service', destination: '/terms' },
  { source: '/hubs/florida/south-florida', destination: '/hubs/south-florida' },
  { source: '/hubs/florida/miami-dade-county', destination: '/hubs/florida/miami-dade' },
  { source: '/hubs/florida/broward', destination: '/hubs/florida/broward-county' },
  { source: '/hubs/florida/palm-beach', destination: '/hubs/florida/palm-beach-county' },
  {
    source: '/resources/how-to-choose-an-insurance-agent',
    destination: '/resources/how-to-choose-insurance-agent',
  },
  {
    source: '/resources/independent-vs-captive-agents',
    destination: '/resources/independent-vs-captive',
  },
  {
    source: '/resources/hurricane-prep-insurance-florida',
    destination: '/resources/hurricane-prep-insurance',
  },
  { source: '/tools/aca-eligibility-checker', destination: '/calculators/aca-subsidy' },
  { source: '/tools/quote-comparison', destination: '/tools/cost-estimator' },
  { source: '/tools/needs-assessment', destination: '/tools/coverage-compass' },
];

const REDIRECT_SOURCES = new Set(PERMANENT_REDIRECTS.map((redirect) => redirect.source));

export function isPermanentRedirectSource(path: string): boolean {
  return REDIRECT_SOURCES.has(path);
}
