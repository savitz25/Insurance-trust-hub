/**
 * Phase 16 — shared regulator display copy for live inventory states.
 * Display-only. Does not change stored license_source strings used by trust gates.
 */

import { FL_DFS_LOOKUP_URL } from '@/lib/dfs/launch-counties';
import { TX_TDI_LOOKUP_URL } from '@/lib/tdi/launch-markets';
import { OH_ODI_LOOKUP_URL } from '@/lib/odi/launch-markets';
import { NJ_DOBI_LOOKUP_URL } from '@/lib/nj/launch-regions';
import { NC_DOI_LOOKUP_URL } from '@/lib/nc/launch-markets';
import { NV_DOI_LOOKUP_URL } from '@/lib/nv/launch-markets';
import { VT_DFR_LOOKUP_URL } from '@/lib/vt/launch-markets';
import { MA_DOI_LOOKUP_URL } from '@/lib/ma/launch-markets';
import { MS_MID_LOOKUP_URL } from '@/lib/ms/launch-markets';

export type RegulatorProfile = {
  code: string;
  /** Consumer-facing full label, uniform "Name (ABBREV)" pattern where useful */
  label: string;
  /** Short token used in "never infer Medicare from X" sentences */
  short: string;
  lookupUrl: string;
  lookupLinkLabel: string;
  loaSource: string;
  /** Extra inventory honesty clause after the Medicare non-claim */
  inventoryNote: string;
  /** Hub / directory kicker */
  profileKicker: string;
  allowsLeadForm: boolean;
};

const PROFILES: Record<string, RegulatorProfile> = {
  FL: {
    code: 'FL',
    label: 'Florida Department of Financial Services (DFS)',
    short: 'DFS',
    lookupUrl: FL_DFS_LOOKUP_URL,
    lookupLinkLabel: 'Florida DFS licensee search',
    loaSource: 'Florida DFS lines of authority',
    inventoryNote: '',
    profileKicker: 'Florida agency research profile',
    allowsLeadForm: true,
  },
  TX: {
    code: 'TX',
    label: 'Texas Department of Insurance (TDI)',
    short: 'TDI',
    lookupUrl: TX_TDI_LOOKUP_URL,
    lookupLinkLabel: 'Texas TDI agent lookup',
    loaSource: 'Texas TDI license types / qualifications',
    inventoryNote: ' Agency/business entities only in this inventory.',
    profileKicker: 'Texas agency research profile',
    allowsLeadForm: true,
  },
  OH: {
    code: 'OH',
    label: 'Ohio Department of Insurance (ODI)',
    short: 'ODI',
    lookupUrl: OH_ODI_LOOKUP_URL,
    lookupLinkLabel: 'Ohio ODI agent/agency locator',
    loaSource: 'Ohio ODI license types / lines of authority',
    inventoryNote:
      ' Agency/business entities only in this inventory. NPN is shown when present on the ODI mailing-list export.',
    profileKicker: 'Ohio agency research profile',
    allowsLeadForm: true,
  },
  NV: {
    code: 'NV',
    label: 'Nevada Division of Insurance (NV DOI)',
    short: 'NV DOI',
    lookupUrl: NV_DOI_LOOKUP_URL,
    lookupLinkLabel: 'Nevada DOI / SBS licensee search',
    loaSource: 'Nevada DOI firm license types',
    inventoryNote:
      ' Firms/agencies only in this inventory — not a bulk individual producer list. Out-of-state headquarters are not shown on local Nevada hubs.',
    profileKicker: 'Nevada firm research profile',
    allowsLeadForm: false,
  },
  VT: {
    code: 'VT',
    label: 'Vermont Department of Financial Regulation (VT DFR)',
    short: 'VT DFR',
    lookupUrl: VT_DFR_LOOKUP_URL,
    lookupLinkLabel: 'Vermont DFR / SBS licensee search',
    loaSource: 'Vermont DFR license class / lines of authority',
    inventoryNote:
      ' Agencies/firms only — individuals from the quarterly list are not promoted. Out-of-state headquarters are not shown on local Vermont hubs.',
    profileKicker: 'Vermont agency research profile',
    allowsLeadForm: false,
  },
  NC: {
    code: 'NC',
    label: 'North Carolina Department of Insurance (NC DOI)',
    short: 'NC DOI',
    lookupUrl: NC_DOI_LOOKUP_URL,
    lookupLinkLabel: 'North Carolina DOI / SBS licensee search',
    loaSource: 'North Carolina DOI / SBS license types / lines of authority',
    inventoryNote:
      ' Agency/business entities only in this inventory. NPN is shown when present on the SBS export.',
    profileKicker: 'North Carolina agency research profile',
    allowsLeadForm: true,
  },
  NJ: {
    code: 'NJ',
    label: 'New Jersey Department of Banking and Insurance (DOBI)',
    short: 'DOBI',
    lookupUrl: NJ_DOBI_LOOKUP_URL,
    lookupLinkLabel: 'New Jersey DOBI licensee search',
    loaSource: 'New Jersey DOBI organization lines',
    inventoryNote: ' Agency/business entities only in this inventory.',
    profileKicker: 'New Jersey agency research profile',
    allowsLeadForm: true,
  },
  MA: {
    code: 'MA',
    label: 'Massachusetts Division of Insurance (MA DOI)',
    short: 'MA DOI',
    lookupUrl: MA_DOI_LOOKUP_URL,
    lookupLinkLabel: 'Massachusetts DOI / SBS licensee search',
    loaSource: 'Massachusetts DOI agency list / lines of authority',
    inventoryNote:
      ' Agencies/business entities only — licensed companies, carriers, and reinsurers are not promoted as agencies. Out-of-state headquarters are not shown on local Massachusetts hubs.',
    profileKicker: 'Massachusetts agency research profile',
    allowsLeadForm: false,
  },
  MS: {
    code: 'MS',
    label: 'Mississippi Insurance Department (MID)',
    short: 'MID',
    lookupUrl: MS_MID_LOOKUP_URL,
    lookupLinkLabel: 'Mississippi MID licensee search',
    loaSource: 'Mississippi MID Insurance Producer Entity license',
    inventoryNote:
      ' Insurance Producer Entity / business agencies only in this inventory. Out-of-state headquarters are not shown on local Mississippi hubs. Lines of authority are not listed on the MID entity export.',
    profileKicker: 'Mississippi agency research profile',
    allowsLeadForm: false,
  },
};

export function normalizeStateCode(raw?: string | null): string {
  return (raw || '').trim().toUpperCase().slice(0, 2);
}

export function getRegulatorProfile(state?: string | null): RegulatorProfile | null {
  const code = normalizeStateCode(state);
  return PROFILES[code] ?? null;
}

export function getRegulatorLabel(
  state?: string | null,
  fallback = 'State insurance department'
): string {
  return getRegulatorProfile(state)?.label ?? fallback;
}

export function getRegulatorShortLabel(state?: string | null, fallback = 'state DOI'): string {
  return getRegulatorProfile(state)?.short ?? fallback;
}

export function getRegulatorLookupUrl(state?: string | null): string | null {
  return getRegulatorProfile(state)?.lookupUrl ?? null;
}

export function getVerificationExplanation(
  state?: string | null,
  fallbackLabel?: string
): string {
  const label = getRegulatorLabel(state, fallbackLabel || 'The state insurance department');
  return `${label} is the license source of truth for this research listing.`;
}

export function getMedicareNonClaim(state?: string | null): string {
  const profile = getRegulatorProfile(state);
  const short = profile?.short ?? 'state DOI';
  const note = profile?.inventoryNote ?? '';
  return `Medicare-certified status is never inferred from ${short} data alone.${note}`;
}

export function getLoaSourcePhrase(state?: string | null): string {
  return (
    getRegulatorProfile(state)?.loaSource ??
    'the public state insurance department license record'
  );
}

export function getResearchProfileKicker(state?: string | null): string {
  return getRegulatorProfile(state)?.profileKicker ?? 'Agency research profile';
}

export function allowsRegulatorLeadForm(state?: string | null): boolean {
  return getRegulatorProfile(state)?.allowsLeadForm ?? false;
}

export function getDirectoryStateIntro(state?: string | null): string {
  const code = normalizeStateCode(state);
  switch (code) {
    case 'FL':
      return 'Florida DFS–verified agency research listings. Always re-check licenses on official DFS tools.';
    case 'TX':
      return 'Texas Department of Insurance (TDI)–verified agency research listings. Always re-check licenses on official TDI tools.';
    case 'OH':
      return 'Ohio Department of Insurance (ODI)–verified agency research listings. Agency/business entities only. Empty markets stay empty. Always re-check licenses on the official ODI locator.';
    case 'NV':
      return 'Nevada Division of Insurance (NV DOI)–verified firm research listings. Agency/producer firms with a Nevada address. Empty markets stay empty. Always re-check licenses on official NV DOI / SBS tools.';
    case 'VT':
      return 'Vermont Department of Financial Regulation (VT DFR)–verified agency research listings. Firms only — not a bulk individual producer list. Empty markets stay empty. Always re-check licenses on official VT DFR / SBS tools.';
    case 'MA':
      return 'Massachusetts Division of Insurance (MA DOI)–verified agency research listings. Agencies and business entities only — not licensed companies or carriers. Empty markets stay empty. Always re-check licenses on official MA DOI / SBS tools.';
    case 'MS':
      return 'Mississippi Insurance Department (MID)–verified agency research listings. Insurance Producer Entity / business agencies only. Empty markets stay empty. Always re-check licenses on official MID tools.';
    case 'NC':
      return 'North Carolina Department of Insurance (NC DOI)–verified agency research listings. Agency/business entities only. Empty markets stay empty. Always re-check licenses on official NC DOI / SBS tools.';
    case 'NJ':
      return 'New Jersey DOBI–verified agency research listings. Always re-check licenses on official DOBI tools.';
    default:
      return 'Verified research listings only — Florida DFS, Texas TDI, Ohio ODI, Nevada DOI, Vermont DFR, Massachusetts DOI, and Mississippi MID. North Carolina DOI appears when promoted. Empty filters stay empty. Always re-check licensing on official state tools before you enroll.';
  }
}

/** Honest metro population — never render "0.0M" for small markets. */
export function formatHubPopulation(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 10_000) return `${Math.round(n / 1_000)}k`;
  return n.toLocaleString();
}
