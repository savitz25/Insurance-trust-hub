/**
 * Phase 7 — consumer display helpers for Florida agency research dossiers.
 * Never invents DBA, Medicare, or websites.
 */

import type { Provider } from '@/types/provider';
import { matchLaunchCounty } from '@/lib/dfs/launch-counties';
import { loaSpecialtyTags } from '@/lib/dfs/loa';
import { matchNvLaunchMarket } from '@/lib/nv/launch-markets';
import { matchVtLaunchMarket } from '@/lib/vt/launch-markets';
import { matchMaLaunchMarket } from '@/lib/ma/launch-markets';
import { matchMsLaunchMarket } from '@/lib/ms/launch-markets';
import { getRegulatorLabel } from '@/lib/regulators/labels';

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
    'Licensed as an agency entity (or agency customer representative) on the public regulator record.',
  'Independent Agency':
    'Business/agency listing — may place coverage with multiple carriers when appointed.',
  Health:
    'Reported lines of authority include health (and related accident/disability when present on the public record).',
  Life: 'Reported lines of authority include life and/or annuities when present on the public record.',
  'Property & Casualty':
    'Reported lines of authority include property and/or casualty (P&C) when present on the public record.',
  'Personal Lines':
    'Reported lines of authority include personal lines (e.g. auto/home-style authority when present).',
  Title:
    'Reported lines of authority include title insurance when present on the license record.',
  'Public Adjuster':
    'Reported lines of authority include public adjuster authority when present on the license record.',
  Variable:
    'Reported lines of authority include variable life or variable annuity authority when present on the public record.',
};

const UNMAPPED_LOA =
  'Shown as reported on the public license record. We do not add meaning beyond that tag, and never infer Medicare network status from it.';

export function loaPlainLanguageForTags(tags: string[]): Array<{
  tag: string;
  blurb: string;
  mapped: boolean;
}> {
  return tags.map((tag) => {
    const mapped = Boolean(LOA_PLAIN_LANGUAGE[tag]);
    return {
      tag,
      blurb: LOA_PLAIN_LANGUAGE[tag] ?? UNMAPPED_LOA,
      mapped,
    };
  });
}

/** Soft local hub path for FL / TX / NJ / OH / NV / VT / MA / MS launch markets. */
export function localHubPathForProvider(provider: Provider): {
  href: string;
  label: string;
} | null {
  const st = (provider.license_state || provider.state || '').toUpperCase();
  if (st === 'MS') {
    const m = matchMsLaunchMarket({
      city: provider.city,
      zip: provider.zip,
      hqState: 'MS',
    });
    if (m?.hubSlugs[0]) {
      return {
        href: `/hubs/mississippi/${m.hubSlugs[0]}`,
        label: `${m.displayName} agency hub`,
      };
    }
    return { href: '/hubs/mississippi', label: 'Mississippi insurance hubs' };
  }
  if (st === 'MA') {
    const m = matchMaLaunchMarket({
      city: provider.city,
      zip: provider.zip,
      hqState: 'MA',
    });
    if (m?.hubSlugs[0]) {
      return {
        href: `/hubs/massachusetts/${m.hubSlugs[0]}`,
        label: `${m.displayName} agency hub`,
      };
    }
    return { href: '/hubs/massachusetts', label: 'Massachusetts insurance hubs' };
  }
  if (st === 'VT') {
    const m = matchVtLaunchMarket({
      city: provider.city,
      zip: provider.zip,
      hqState: 'VT',
    });
    if (m?.hubSlugs[0]) {
      return {
        href: `/hubs/vermont/${m.hubSlugs[0]}`,
        label: `${m.displayName} agency hub`,
      };
    }
    return { href: '/hubs/vermont', label: 'Vermont insurance hubs' };
  }
  if (st === 'NV') {
    const m = matchNvLaunchMarket({
      city: provider.city,
      zip: provider.zip,
      hqState: 'NV',
    });
    if (m?.hubSlugs[0]) {
      return {
        href: `/hubs/nevada/${m.hubSlugs[0]}`,
        label: `${m.displayName} agency hub`,
      };
    }
    return { href: '/hubs/nevada', label: 'Nevada insurance hubs' };
  }
  if (st === 'OH') {
    const city = (provider.city || '').toLowerCase();
    const county = (provider.county || '').toLowerCase();
    const blob = `${city} ${county}`;
    if (/columbus|franklin|dublin|westerville|hilliard|gahanna/.test(blob)) {
      return { href: '/hubs/ohio/columbus', label: 'Columbus agency hub' };
    }
    if (/cleveland|cuyahoga|lakewood|parma|euclid|shaker/.test(blob)) {
      return { href: '/hubs/ohio/cleveland', label: 'Cleveland agency hub' };
    }
    if (/cincinnati|hamilton|mason|west chester|blue ash/.test(blob)) {
      return { href: '/hubs/ohio/cincinnati', label: 'Cincinnati agency hub' };
    }
    if (/toledo|lucas|maumee|sylvania|perrysburg/.test(blob)) {
      return { href: '/hubs/ohio/toledo', label: 'Toledo agency hub' };
    }
    if (/akron|summit|stow|cuyahoga falls|hudson/.test(blob)) {
      return { href: '/hubs/ohio/akron', label: 'Akron agency hub' };
    }
    if (/dayton|montgomery|kettering|beavercreek|centerville/.test(blob)) {
      return { href: '/hubs/ohio/dayton', label: 'Dayton agency hub' };
    }
    return { href: '/hubs/ohio', label: 'Ohio insurance hubs' };
  }
  if (st === 'NJ') {
    const city = (provider.city || '').toLowerCase();
    const county = (provider.county || '').toLowerCase();
    if (
      /camden|cherry hill|burlington|gloucester|atlantic|cape may|cumberland|salem|vineland/.test(
        city + ' ' + county
      )
    ) {
      return {
        href: '/hubs/new-jersey/south-new-jersey',
        label: 'South Jersey agency hub',
      };
    }
    if (
      /middlesex|mercer|monmouth|ocean|somerset|princeton|trenton|new brunswick|toms river|lakewood/.test(
        city + ' ' + county
      )
    ) {
      return {
        href: '/hubs/new-jersey/central-new-jersey',
        label: 'Central Jersey agency hub',
      };
    }
    if (
      /bergen|essex|hudson|passaic|morris|union|newark|jersey city|hoboken|paterson|morristown/.test(
        city + ' ' + county
      )
    ) {
      return {
        href: '/hubs/new-jersey/north-new-jersey',
        label: 'North Jersey agency hub',
      };
    }
    return { href: '/hubs/new-jersey', label: 'New Jersey insurance hubs' };
  }
  if (st === 'TX') {
    const city = (provider.city || '').toLowerCase();
    if (/houston|sugar land|katy|pasadena|pearland|the woodlands/.test(city)) {
      return { href: '/hubs/texas/houston', label: 'Houston agency hub' };
    }
    if (/dallas|plano|irving|garland|richardson|mesquite/.test(city)) {
      return {
        href: '/hubs/texas/dallas-fort-worth',
        label: 'Dallas–Fort Worth agency hub',
      };
    }
    if (/fort worth|arlington|euless|bedford|grapevine/.test(city)) {
      return {
        href: '/hubs/texas/dallas-fort-worth',
        label: 'Dallas–Fort Worth agency hub',
      };
    }
    if (/austin|round rock|cedar park|georgetown|pflugerville/.test(city)) {
      return { href: '/hubs/texas/austin', label: 'Austin agency hub' };
    }
    if (/san antonio|new braunfels|schertz/.test(city)) {
      return {
        href: '/hubs/texas/san-antonio',
        label: 'San Antonio agency hub',
      };
    }
    return { href: '/hubs/texas', label: 'Texas insurance hubs' };
  }
  if (st !== 'FL') return null;
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
  const record = `${getRegulatorLabel(provider.state)} record`;
  if (!tags.length) {
    return `License specialties are listed when reported on the public ${record}.`;
  }
  return `Reported capability tags: ${tags.join(', ')}.`;
}
