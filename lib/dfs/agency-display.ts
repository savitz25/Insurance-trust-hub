/**
 * Phase 7 — consumer display helpers for Florida agency research dossiers.
 * Never invents DBA, Medicare, or websites.
 */

import type { Provider } from '@/types/provider';
import { matchLaunchCounty } from '@/lib/dfs/launch-counties';
import { loaSpecialtyTags } from '@/lib/dfs/loa';

/** Extract DBA when legal name embeds "DBA …" (common on DFS business names). */
export function extractDbaFromName(name: string): {
  legalName: string;
  dba: string | null;
} {
  const raw = (name ?? '').trim();
  if (!raw) return { legalName: '', dba: null };
  const m = raw.match(/^(.+?)\s+(?:d\/?b\/?a|dba)\s+(.+)$/i);
  if (!m) return { legalName: raw, dba: null };
  const legalName = m[1]!.trim().replace(/[,\s]+$/, '');
  const dba = m[2]!.trim().replace(/^["']|["']$/g, '');
  if (!legalName || !dba || dba.length < 2) {
    return { legalName: raw, dba: null };
  }
  return { legalName, dba };
}

/** Plain-language blurbs for LOA capability chips (research only). */
export const LOA_PLAIN_LANGUAGE: Record<string, string> = {
  Agency:
    'Licensed as an agency entity (or agency customer representative) under Florida DFS.',
  'Independent Agency':
    'Business/agency listing — may place coverage with multiple carriers when appointed.',
  Health:
    'Florida DFS lines of authority include health (and related accident/disability when reported).',
  Life: 'Florida DFS lines of authority include life and/or annuities when reported.',
  'Property & Casualty':
    'Florida DFS lines of authority include property and/or casualty (P&C) when reported.',
  'Personal Lines':
    'Florida DFS lines of authority include personal lines (e.g. auto/home-style authority when reported).',
  Title:
    'Florida DFS lines of authority include title insurance when reported on the license record.',
  'Public Adjuster':
    'Florida DFS lines of authority include public adjuster authority when reported.',
};

export function loaPlainLanguageForTags(tags: string[]): Array<{
  tag: string;
  blurb: string;
}> {
  return tags
    .map((tag) => ({
      tag,
      blurb: LOA_PLAIN_LANGUAGE[tag] ?? '',
    }))
    .filter((x) => x.blurb);
}

/** Soft local hub path for FL launch counties (research navigation only). */
export function localHubPathForProvider(provider: Provider): {
  href: string;
  label: string;
} | null {
  if ((provider.state || '').toUpperCase() !== 'FL') return null;
  const matched = matchLaunchCounty(
    provider.county_normalized || provider.county
  );
  if (matched?.hubSlugs?.[0]) {
    const slug = matched.hubSlugs[0];
    if (slug === 'miami-fort-lauderdale') {
      return {
        href: '/hubs/south-florida',
        label: 'South Florida agency hub',
      };
    }
    const labelMap: Record<string, string> = {
      'miami-dade': 'Miami-Dade agency hub',
      'broward-county': 'Broward agency hub',
      'palm-beach-county': 'Palm Beach agency hub',
      jacksonville: 'Jacksonville agency hub',
      tampa: 'Tampa Bay agency hub',
      orlando: 'Orlando agency hub',
    };
    return {
      href: `/hubs/florida/${slug}`,
      label: labelMap[slug] ?? `${matched.displayName} agency hub`,
    };
  }
  const city = (provider.city || '').toLowerCase();
  if (/miami|hialeah|homestead|coral gables/.test(city)) {
    return { href: '/hubs/florida/miami-dade', label: 'Miami-Dade agency hub' };
  }
  if (
    /fort lauderdale|hollywood|hollywood park|pembroke|miramar|plantation|davie|sunrise|coral springs|pompano|deerfield/.test(
      city
    )
  ) {
    return {
      href: '/hubs/florida/broward-county',
      label: 'Broward agency hub',
    };
  }
  if (/west palm|boca|delray|boynton|jupiter|lake worth/.test(city)) {
    return {
      href: '/hubs/florida/palm-beach-county',
      label: 'Palm Beach agency hub',
    };
  }
  if (/jacksonville|duval|orange park|st\.?\s*augustine/.test(city)) {
    return {
      href: '/hubs/florida/jacksonville',
      label: 'Jacksonville agency hub',
    };
  }
  if (/tampa|st\.?\s*pete|clearwater|brandon|lutz/.test(city)) {
    return { href: '/hubs/florida/tampa', label: 'Tampa Bay agency hub' };
  }
  if (/orlando|kissimmee|winter park|sanford|oviedo/.test(city)) {
    return { href: '/hubs/florida/orlando', label: 'Orlando agency hub' };
  }
  return { href: '/hubs/florida', label: 'Florida insurance hubs' };
}

export function agencyCapabilitySummary(provider: Provider): string {
  const tags = loaSpecialtyTags(provider.specialties);
  if (!tags.length) {
    return 'License specialties are listed when reported on the public Florida DFS record.';
  }
  return `Reported capability tags: ${tags.join(', ')}.`;
}
