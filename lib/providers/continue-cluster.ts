/**
 * Phase 20 — continue-research links for a verified profile.
 */

import type { Provider } from '@/types/provider';
import { clusterForHubSlug, clusterForPath, type SeoClusterLink } from '@/lib/seo/seo-clusters';
import { getRegulatorProfile } from '@/lib/regulators/labels';
import { localHubPathForProvider } from '@/lib/dfs/agency-display';

export type ContinueClusterResult = {
  heading: string;
  links: SeoClusterLink[];
};

export function continueClusterForProvider(provider: Provider): ContinueClusterResult {
  const localHub = localHubPathForProvider(provider);
  const cluster =
    (localHub ? clusterForPath(localHub.href) : null) ||
    clusterForHubSlug(localHub?.href.split('/').pop() || '') ||
    null;
  const regulator = getRegulatorProfile(provider.state);
  const state = (provider.state || '').toUpperCase();

  const links: SeoClusterLink[] = [];
  if (localHub) {
    links.push({ href: localHub.href, label: localHub.label });
  } else if (cluster) {
    links.push({ href: cluster.hubPath, label: `${cluster.marketName} hub` });
  }
  if (state) {
    links.push({
      href: `/directory?state=${state}&verified=true`,
      label: `Verified ${state} directory`,
    });
  }
  if (cluster) {
    for (const g of cluster.guides.slice(0, 2)) links.push(g);
  }
  links.push(
    { href: '/tools/marketplace-plan-research', label: 'Marketplace plan research' },
    { href: '/calculators/aca-subsidy', label: 'ACA savings planner' },
    { href: '/tools/cost-estimator', label: 'Cost planner' },
    { href: '/tools/license-verification', label: 'License verification' },
    { href: '/data/plan-complaint-index', label: 'Complaint Index' }
  );
  if (regulator?.lookupUrl) {
    links.push({ href: regulator.lookupUrl, label: regulator.lookupLinkLabel });
  }
  links.push({ href: '/methodology', label: 'Methodology' });

  const deduped = links.filter((l, i, arr) => arr.findIndex((x) => x.href === l.href) === i);
  return {
    heading: cluster
      ? `Continue research in ${cluster.marketName}`
      : 'Continue this research',
    links: deduped,
  };
}
