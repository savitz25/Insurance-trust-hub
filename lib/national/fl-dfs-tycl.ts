/**
 * FL-INS-001 — Florida DFS License TYCL is credential class, never LOA.
 * Raw TYCL Desc is preserved. Namespace/subtype are derived only.
 */
import { normalizeNpn } from './npn';
import type { LicenseNamespace } from './credential-namespace';

export const FL_DFS_LICENSE_SOURCE = {
  authority: 'Florida Department of Financial Services',
  portal: 'https://licenseesearch.fldfs.com/BulkDownload',
  businessFile: 'AllValidLicensesBusiness.csv',
  individualFile: 'AllValidLicensesIndividual.csv',
  businessAppointments: 'AllActiveAppointmentsBusiness.csv',
  individualAppointments: [
    'AllActiveAppointmentsIndividual(A-C).csv',
    'AllActiveAppointmentsIndividual(D-G).csv',
    'AllActiveAppointmentsIndividual(H-L).csv',
    'AllActiveAppointmentsIndividual(M-P).csv',
    'AllActiveAppointmentsIndividual(Q-S).csv',
    'AllActiveAppointmentsIndividual(T-Z).csv',
  ],
} as const;

export type FlDfsSubtype =
  | 'GENERAL_LINES_PC'
  | 'PERSONAL_LINES'
  | 'LIFE'
  | 'HEALTH'
  | 'LIFE_HEALTH'
  | 'LIFE_VARIABLE'
  | 'LIFE_VARIABLE_HEALTH'
  | 'CREDIT'
  | 'TRAVEL'
  | 'LIMITED_LINES_OTHER'
  | 'AGENCY'
  | 'MGA'
  | 'TEMPORARY'
  | 'CUSTOMER_REPRESENTATIVE'
  | 'TITLE_AGENT'
  | 'TITLE_AGENCY'
  | 'PUBLIC_ADJUSTER'
  | 'PUBLIC_ADJUSTER_APPRENTICE'
  | 'PUBLIC_ADJUSTING_FIRM'
  | 'INDEPENDENT_ADJUSTER'
  | 'INDEPENDENT_ADJUSTING_FIRM'
  | 'COMPANY_ADJUSTER'
  | 'OTHER_ADJUSTER'
  | 'SURPLUS_LINES_AGENT'
  | 'SURPLUS_LINES_AGENCY'
  | 'WARRANTY_HOME'
  | 'WARRANTY_AUTO'
  | 'WARRANTY_SERVICE'
  | 'BAIL_BOND'
  | 'BAIL_AGENCY'
  | 'OTHER';

export type FlDfsClassDecision = {
  raw: string;
  namespace: LicenseNamespace;
  subtype: FlDfsSubtype;
  grain: 'person' | 'agency' | 'either';
  residencyFromClassPrefix: 'resident' | 'nonresident' | 'unknown';
  confidence: 'CONFIRMED' | 'HIGH_CONFIDENCE' | 'REVIEW_REQUIRED';
  promoteAsCanonicalAgency: boolean;
  notes: string;
};

export function cleanDfsCell(raw: string | null | undefined): string {
  if (raw == null) return '';
  let s = String(raw).trim();
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim();
  }
  const excel = s.match(/^=\s*"([^"]*)"\s*$/);
  if (excel) return excel[1].trim();
  const excel2 = s.match(/^=\s*(.+)\s*$/);
  if (excel2 && !s.includes(' ')) return excel2[1].replace(/^"|"$/g, '').trim();
  return s;
}

export function parseDfsResidencyType(raw: string | null | undefined): 'resident' | 'nonresident' | 'unknown' {
  const s = cleanDfsCell(raw).toLowerCase();
  if (!s) return 'unknown';
  if (/non[-\s]?res/.test(s)) return 'nonresident';
  if (/^resident/.test(s)) return 'resident';
  return 'unknown';
}

export function normalizeFlLicenseStatus(raw: string | null | undefined): string {
  const s = cleanDfsCell(raw).toUpperCase();
  if (!s) return 'UNKNOWN';
  if (s === 'VALID' || s === 'ACTIVE' || s === 'CURRENT') return 'ACTIVE';
  if (/INACTIVE/.test(s)) return 'INACTIVE';
  if (/EXPIRED/.test(s)) return 'EXPIRED';
  if (/CANCEL/.test(s)) return 'CANCELLED';
  if (/SUSPEND/.test(s)) return 'SUSPENDED';
  return 'OTHER';
}

function stripNonres(desc: string): { core: string; nonres: boolean } {
  const u = desc.toUpperCase().replace(/\s+/g, ' ').trim();
  const nonres = /^(NON-?RESIDENT|NON-?RES)\b/.test(u);
  const core = u.replace(/^(NON-?RESIDENT|NON-?RES)\s+/, '').trim();
  return { core, nonres };
}

const EXACT: Record<string, Omit<FlDfsClassDecision, 'raw' | 'residencyFromClassPrefix'>> = {
  'GEN LINES (PROP & CAS)': {
    namespace: 'producer',
    subtype: 'GENERAL_LINES_PC',
    grain: 'person',
    confidence: 'CONFIRMED',
    promoteAsCanonicalAgency: false,
    notes: 'Individual general lines P&C (abbrev)',
  },
  'LIFE & VARIABLE ANNUITY': {
    namespace: 'producer',
    subtype: 'LIFE_VARIABLE',
    grain: 'person',
    confidence: 'CONFIRMED',
    promoteAsCanonicalAgency: false,
    notes: 'Life including variable annuity (abbrev)',
  },
  'ADJUSTER - ALL LINES': {
    namespace: 'adjuster',
    subtype: 'INDEPENDENT_ADJUSTER',
    grain: 'person',
    confidence: 'HIGH_CONFIDENCE',
    promoteAsCanonicalAgency: false,
    notes: 'All-lines adjuster; not public adjuster',
  },
  'GENERAL LINES (PROP & CAS)': {
    namespace: 'producer',
    subtype: 'GENERAL_LINES_PC',
    grain: 'person',
    confidence: 'CONFIRMED',
    promoteAsCanonicalAgency: false,
    notes: 'Individual general lines P&C',
  },
  'PERSONAL LINES AGENT': {
    namespace: 'producer',
    subtype: 'PERSONAL_LINES',
    grain: 'person',
    confidence: 'CONFIRMED',
    promoteAsCanonicalAgency: false,
    notes: 'Individual personal lines',
  },
  LIFE: {
    namespace: 'producer',
    subtype: 'LIFE',
    grain: 'person',
    confidence: 'CONFIRMED',
    promoteAsCanonicalAgency: false,
    notes: 'Life only',
  },
  HEALTH: {
    namespace: 'producer',
    subtype: 'HEALTH',
    grain: 'person',
    confidence: 'CONFIRMED',
    promoteAsCanonicalAgency: false,
    notes: 'Health only',
  },
  'LIFE & HEALTH': {
    namespace: 'producer',
    subtype: 'LIFE_HEALTH',
    grain: 'person',
    confidence: 'CONFIRMED',
    promoteAsCanonicalAgency: false,
    notes: 'Life and health',
  },
  'LIFE INCL VARIABLE ANNUITY': {
    namespace: 'producer',
    subtype: 'LIFE_VARIABLE',
    grain: 'person',
    confidence: 'CONFIRMED',
    promoteAsCanonicalAgency: false,
    notes: 'Life including variable annuity',
  },
  'LIFE INCL VAR ANNUITY & HEALTH': {
    namespace: 'producer',
    subtype: 'LIFE_VARIABLE_HEALTH',
    grain: 'person',
    confidence: 'CONFIRMED',
    promoteAsCanonicalAgency: false,
    notes: 'Life including variable annuity and health',
  },
  'AGENCY LICENSE': {
    namespace: 'producer',
    subtype: 'AGENCY',
    grain: 'agency',
    confidence: 'CONFIRMED',
    promoteAsCanonicalAgency: true,
    notes: 'Core insurance agency',
  },
  'MANAGING GENERAL AGENT': {
    namespace: 'producer',
    subtype: 'MGA',
    grain: 'agency',
    confidence: 'CONFIRMED',
    promoteAsCanonicalAgency: false,
    notes: 'Specialty MGA — not core agency by default',
  },
  'PUBLIC ADJUSTER': {
    namespace: 'adjuster',
    subtype: 'PUBLIC_ADJUSTER',
    grain: 'person',
    confidence: 'CONFIRMED',
    promoteAsCanonicalAgency: false,
    notes: 'Individual public adjuster',
  },
  'PUBLIC ADJUSTER APPRENTICE': {
    namespace: 'adjuster',
    subtype: 'PUBLIC_ADJUSTER_APPRENTICE',
    grain: 'person',
    confidence: 'CONFIRMED',
    promoteAsCanonicalAgency: false,
    notes: 'Apprentice public adjuster',
  },
  'PUBLIC ADJUSTING FIRM': {
    namespace: 'adjuster',
    subtype: 'PUBLIC_ADJUSTING_FIRM',
    grain: 'agency',
    confidence: 'CONFIRMED',
    promoteAsCanonicalAgency: false,
    notes: 'Firm, not individual, not producer',
  },
  'ALL LINES ADJUSTER': {
    namespace: 'adjuster',
    subtype: 'INDEPENDENT_ADJUSTER',
    grain: 'person',
    confidence: 'HIGH_CONFIDENCE',
    promoteAsCanonicalAgency: false,
    notes: 'DFS all-lines adjuster; not public adjuster',
  },
  'INDEPENDENT ADJUSTER': {
    namespace: 'adjuster',
    subtype: 'INDEPENDENT_ADJUSTER',
    grain: 'person',
    confidence: 'CONFIRMED',
    promoteAsCanonicalAgency: false,
    notes: 'Independent adjuster',
  },
  'INDEPENDENT ADJUSTING FIRM': {
    namespace: 'adjuster',
    subtype: 'INDEPENDENT_ADJUSTING_FIRM',
    grain: 'agency',
    confidence: 'CONFIRMED',
    promoteAsCanonicalAgency: false,
    notes: 'Independent adjusting firm',
  },
  'COMPANY ADJUSTER': {
    namespace: 'adjuster',
    subtype: 'COMPANY_ADJUSTER',
    grain: 'person',
    confidence: 'CONFIRMED',
    promoteAsCanonicalAgency: false,
    notes: 'Company adjuster',
  },
  'SURPLUS LINES': {
    namespace: 'surplus_lines',
    subtype: 'SURPLUS_LINES_AGENT',
    grain: 'person',
    confidence: 'CONFIRMED',
    promoteAsCanonicalAgency: false,
    notes: 'Surplus-lines agent license; not eligible insurer',
  },
  'SURPLUS LINES AGENT': {
    namespace: 'surplus_lines',
    subtype: 'SURPLUS_LINES_AGENT',
    grain: 'person',
    confidence: 'CONFIRMED',
    promoteAsCanonicalAgency: false,
    notes: 'Surplus-lines agent; not eligible insurer',
  },
  'HOME WARRANTY': {
    namespace: 'warranty',
    subtype: 'WARRANTY_HOME',
    grain: 'agency',
    confidence: 'CONFIRMED',
    promoteAsCanonicalAgency: false,
    notes: 'Warranty association / seller — not core agency',
  },
  'AUTOMOBILE WARRANTY': {
    namespace: 'warranty',
    subtype: 'WARRANTY_AUTO',
    grain: 'agency',
    confidence: 'CONFIRMED',
    promoteAsCanonicalAgency: false,
    notes: 'Auto warranty — not core agency',
  },
  'SERVICE WARRANTY': {
    namespace: 'warranty',
    subtype: 'WARRANTY_SERVICE',
    grain: 'agency',
    confidence: 'CONFIRMED',
    promoteAsCanonicalAgency: false,
    notes: 'Service warranty — not core agency',
  },
  'TITLE AGENCY': {
    namespace: 'title',
    subtype: 'TITLE_AGENCY',
    grain: 'agency',
    confidence: 'CONFIRMED',
    promoteAsCanonicalAgency: false,
    notes: 'Title agency',
  },
  'TITLE AGENT': {
    namespace: 'title',
    subtype: 'TITLE_AGENT',
    grain: 'person',
    confidence: 'CONFIRMED',
    promoteAsCanonicalAgency: false,
    notes: 'Title agent',
  },
  'BAIL BOND AGENCY LICENSE': {
    namespace: 'bail_bond',
    subtype: 'BAIL_AGENCY',
    grain: 'agency',
    confidence: 'CONFIRMED',
    promoteAsCanonicalAgency: false,
    notes: 'Bail-bond agency',
  },
  'BAIL BOND AGENT': {
    namespace: 'bail_bond',
    subtype: 'BAIL_BOND',
    grain: 'person',
    confidence: 'CONFIRMED',
    promoteAsCanonicalAgency: false,
    notes: 'Bail-bond agent',
  },
  'CUSTOMER REPRESENTATIVE': {
    namespace: 'producer',
    subtype: 'CUSTOMER_REPRESENTATIVE',
    grain: 'person',
    confidence: 'CONFIRMED',
    promoteAsCanonicalAgency: false,
    notes: 'Customer representative — not core producer for person graph historically',
  },
  'LEGAL EXPENSE': {
    namespace: 'limited_lines',
    subtype: 'LIMITED_LINES_OTHER',
    grain: 'either',
    confidence: 'CONFIRMED',
    promoteAsCanonicalAgency: false,
    notes: 'Limited class',
  },
  'MOTOR VEHICLE RENTAL': {
    namespace: 'limited_lines',
    subtype: 'LIMITED_LINES_OTHER',
    grain: 'either',
    confidence: 'CONFIRMED',
    promoteAsCanonicalAgency: false,
    notes: 'Limited lines motor vehicle rental',
  },
  'CREDIT': {
    namespace: 'limited_lines',
    subtype: 'CREDIT',
    grain: 'either',
    confidence: 'CONFIRMED',
    promoteAsCanonicalAgency: false,
    notes: 'Credit limited lines',
  },
  'TRAVEL': {
    namespace: 'limited_lines',
    subtype: 'TRAVEL',
    grain: 'either',
    confidence: 'CONFIRMED',
    promoteAsCanonicalAgency: false,
    notes: 'Travel limited lines',
  },
  'PORTABLE ELECTRONICS': {
    namespace: 'limited_lines',
    subtype: 'LIMITED_LINES_OTHER',
    grain: 'either',
    confidence: 'CONFIRMED',
    promoteAsCanonicalAgency: false,
    notes: 'Portable electronics limited lines',
  },
};

export function tyclIsNotLoa(): true {
  return true;
}

export function surplusLinesAgentIsNotEligibleInsurer(): true {
  return true;
}

export function classifyFlDfsTycl(rawDesc: string | null | undefined): FlDfsClassDecision {
  const raw = cleanDfsCell(rawDesc);
  const { core, nonres } = stripNonres(raw);
  const hit = EXACT[core];
  const residencyFromClassPrefix = nonres ? 'nonresident' : 'unknown';
  if (hit) {
    return { raw, residencyFromClassPrefix, ...hit };
  }
  if (/PUBLIC ADJUST.*APPRENTICE/.test(core)) {
    return {
      raw,
      namespace: 'adjuster',
      subtype: 'PUBLIC_ADJUSTER_APPRENTICE',
      grain: 'person',
      residencyFromClassPrefix,
      confidence: 'CONFIRMED',
      promoteAsCanonicalAgency: false,
      notes: 'Public adjuster apprentice',
    };
  }
  if (/PUBLIC ADJUSTING FIRM/.test(core)) {
    return {
      raw,
      namespace: 'adjuster',
      subtype: 'PUBLIC_ADJUSTING_FIRM',
      grain: 'agency',
      residencyFromClassPrefix,
      confidence: 'CONFIRMED',
      promoteAsCanonicalAgency: false,
      notes: 'Public adjusting firm',
    };
  }
  if (/PUBLIC ADJUST/.test(core)) {
    return {
      raw,
      namespace: 'adjuster',
      subtype: 'PUBLIC_ADJUSTER',
      grain: 'person',
      residencyFromClassPrefix,
      confidence: 'CONFIRMED',
      promoteAsCanonicalAgency: false,
      notes: 'Public adjuster (raw variant)',
    };
  }
  if (/INDEPENDENT ADJUSTING FIRM/.test(core)) {
    return {
      raw,
      namespace: 'adjuster',
      subtype: 'INDEPENDENT_ADJUSTING_FIRM',
      grain: 'agency',
      residencyFromClassPrefix,
      confidence: 'CONFIRMED',
      promoteAsCanonicalAgency: false,
      notes: 'Independent adjusting firm',
    };
  }
  if (/INDEPENDENT ADJUST/.test(core)) {
    return {
      raw,
      namespace: 'adjuster',
      subtype: 'INDEPENDENT_ADJUSTER',
      grain: 'person',
      residencyFromClassPrefix,
      confidence: 'CONFIRMED',
      promoteAsCanonicalAgency: false,
      notes: 'Independent adjuster',
    };
  }
  if (/SURPLUS/.test(core)) {
    return {
      raw,
      namespace: 'surplus_lines',
      subtype: /AGENCY|FIRM/.test(core) ? 'SURPLUS_LINES_AGENCY' : 'SURPLUS_LINES_AGENT',
      grain: /AGENCY|FIRM/.test(core) ? 'agency' : 'person',
      residencyFromClassPrefix,
      confidence: 'CONFIRMED',
      promoteAsCanonicalAgency: false,
      notes: 'Surplus-lines producer class; not an eligible insurer',
    };
  }
  if (/WARRANT/.test(core)) {
    return {
      raw,
      namespace: 'warranty',
      subtype: /AUTO/.test(core) ? 'WARRANTY_AUTO' : /HOME/.test(core) ? 'WARRANTY_HOME' : 'WARRANTY_SERVICE',
      grain: 'agency',
      residencyFromClassPrefix,
      confidence: 'HIGH_CONFIDENCE',
      promoteAsCanonicalAgency: false,
      notes: 'Warranty class',
    };
  }
  if (/BAIL/.test(core)) {
    return {
      raw,
      namespace: 'bail_bond',
      subtype: /AGENCY/.test(core) ? 'BAIL_AGENCY' : 'BAIL_BOND',
      grain: /AGENCY/.test(core) ? 'agency' : 'person',
      residencyFromClassPrefix,
      confidence: 'CONFIRMED',
      promoteAsCanonicalAgency: false,
      notes: 'Bail class',
    };
  }
  if (/TITLE/.test(core)) {
    return {
      raw,
      namespace: 'title',
      subtype: /AGENCY/.test(core) ? 'TITLE_AGENCY' : 'TITLE_AGENT',
      grain: /AGENCY/.test(core) ? 'agency' : 'person',
      residencyFromClassPrefix,
      confidence: 'HIGH_CONFIDENCE',
      promoteAsCanonicalAgency: false,
      notes: 'Title class',
    };
  }
  if (/TRAVEL/.test(core)) {
    return {
      raw,
      namespace: 'limited_lines',
      subtype: 'TRAVEL',
      grain: 'either',
      residencyFromClassPrefix,
      confidence: 'CONFIRMED',
      promoteAsCanonicalAgency: false,
      notes: 'Travel limited lines',
    };
  }
  if (/CREDIT/.test(core)) {
    return {
      raw,
      namespace: 'limited_lines',
      subtype: 'CREDIT',
      grain: 'either',
      residencyFromClassPrefix,
      confidence: 'CONFIRMED',
      promoteAsCanonicalAgency: false,
      notes: 'Credit limited lines',
    };
  }
  if (/LIMITED|PORTABLE|RENTAL|IN-TRANSIT|LEGAL EXPENSE/.test(core)) {
    return {
      raw,
      namespace: 'limited_lines',
      subtype: 'LIMITED_LINES_OTHER',
      grain: 'either',
      residencyFromClassPrefix,
      confidence: 'HIGH_CONFIDENCE',
      promoteAsCanonicalAgency: false,
      notes: 'Limited-lines class',
    };
  }
  if (/TEMPORARY/.test(core)) {
    return {
      raw,
      namespace: 'producer',
      subtype: 'TEMPORARY',
      grain: 'person',
      residencyFromClassPrefix,
      confidence: 'CONFIRMED',
      promoteAsCanonicalAgency: false,
      notes: 'Temporary class',
    };
  }
  return {
    raw,
    namespace: 'other',
    subtype: 'OTHER',
    grain: 'either',
    residencyFromClassPrefix,
    confidence: 'REVIEW_REQUIRED',
    promoteAsCanonicalAgency: false,
    notes: 'Unmapped TYCL; raw preserved',
  };
}

export function extractDfsNpn(raw: string | null | undefined): string | null {
  return normalizeNpn(cleanDfsCell(raw));
}
