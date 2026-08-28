/**
 * National market-intelligence observation contract.
 * Florida is the first state user. Do not encode Florida-only architecture.
 * Observations may attach to an entity or remain aggregate (entity_id NULL).
 */
import type { IdentityConfidence } from './types';

export const MARKET_INTELLIGENCE_TASK = 'FL-INS-005';
export const MARKET_INTELLIGENCE_TRANSFORM = 'market-intelligence.v1';

export const MARKET_METRIC_FAMILY = {
  POLICIES_IN_FORCE: 'POLICIES_IN_FORCE',
  WRITTEN_PREMIUM: 'WRITTEN_PREMIUM',
  EARNED_PREMIUM: 'EARNED_PREMIUM',
  MARKET_SHARE: 'MARKET_SHARE',
  SAMPLE_PREMIUM: 'SAMPLE_PREMIUM',
  FILING_EVENT: 'FILING_EVENT',
  RESIDUAL_MARKET: 'RESIDUAL_MARKET',
  TAKEOUT_OFFER: 'TAKEOUT_OFFER',
  TAKEOUT_ASSUMPTION: 'TAKEOUT_ASSUMPTION',
  SURPLUS_LINES_ELIGIBILITY: 'SURPLUS_LINES_ELIGIBILITY',
  SURPLUS_LINES_PREMIUM: 'SURPLUS_LINES_PREMIUM',
  SURPLUS_LINES_POLICY_COUNT: 'SURPLUS_LINES_POLICY_COUNT',
  NFIP_REGISTRY_LISTING: 'NFIP_REGISTRY_LISTING',
  AGGREGATE_MARKET: 'AGGREGATE_MARKET',
} as const;

export type MarketMetricFamily =
  (typeof MARKET_METRIC_FAMILY)[keyof typeof MARKET_METRIC_FAMILY];

export const SOURCE_CLOCK = {
  MIR: 'mir',
  CHOICES: 'choices',
  IRFS: 'irfs',
  CITIZENS: 'citizens',
  FSLSO: 'fslso',
  NFIP: 'nfip',
  OIR_COMPANY: 'oir_company',
  DFS_LICENSING: 'dfs_licensing',
} as const;

export const GEOGRAPHY_TYPE = {
  STATEWIDE: 'statewide',
  COUNTY: 'county',
  ZIP: 'zip',
  NONE: 'none',
} as const;

export const PRODUCT_LINE = {
  PERSONAL_RESIDENTIAL: 'personal_residential',
  COMMERCIAL_RESIDENTIAL: 'commercial_residential',
  HOMEOWNERS: 'homeowners',
  AUTO: 'private_passenger_auto',
  HEALTH: 'health',
  MEDIGAP: 'medigap',
  MEDICARE_ADVANTAGE: 'medicare_advantage',
  PART_D: 'part_d',
  LIFE: 'life',
  ANNUITY: 'annuity',
  SURPLUS_LINES: 'surplus_lines',
  FLOOD_NFIP: 'flood_nfip',
  FLOOD_PRIVATE: 'flood_private',
  FLOOD_SURPLUS: 'flood_surplus',
} as const;

export function marketShareIsQuality(): false {
  return false;
}
export function premiumIsQuote(): false {
  return false;
}
export function sampleRateIsActualPrice(): false {
  return false;
}
export function rateFilingIsApproval(): false {
  return false;
}
export function approvedFilingIsGoodRate(): false {
  return false;
}
export function missingMarketDataIsZeroActivity(): false {
  return false;
}
export function rankingsAllowed(): false {
  return false;
}
export function marketIntelligenceChangesTrustScore(): false {
  return false;
}
export function nameOnlyMarketAttach(): false {
  return false;
}
export function aggregateRequiresEntity(): false {
  return false;
}
export function countyAppointmentIsServiceTerritory(): false {
  return false;
}
export function agencyAddressIsMarketGeography(): false {
  return false;
}
export function sourceClocksMayCombine(): false {
  return false;
}
export function autoEqualsProperty(): false {
  return false;
}
export function medigapEqualsMedicareAdvantage(): false {
  return false;
}
export function medigapEqualsPartD(): false {
  return false;
}
export function cmsRegistrationEqualsStateAuthorization(): false {
  return false;
}

export type MarketIdentityDecision =
  | {
      confidence: 'CONFIRMED';
      attach: true;
      kind: 'legal_insurer' | 'person' | 'agency';
      key: string;
      matchBasis: string;
    }
  | {
      confidence: 'UNRESOLVED' | 'REVIEW_REQUIRED';
      attach: false;
      kind: null;
      matchBasis: string;
      aggregateOk: boolean;
    };

export function decideMarketInsurerIdentity(input: {
  naicCoCode?: string | null;
  flCompanyCode?: string | null;
  officialCoCodes: ReadonlySet<string>;
  flCodeToNaic: ReadonlyMap<string, string>;
  nameOnly?: string | null;
}): MarketIdentityDecision {
  const naic = String(input.naicCoCode || '').replace(/\D/g, '');
  const fl = String(input.flCompanyCode || '').replace(/\D/g, '').padStart(5, '0');
  if (/^\d{5}$/.test(naic) && input.officialCoCodes.has(naic)) {
    return {
      confidence: 'CONFIRMED',
      attach: true,
      kind: 'legal_insurer',
      key: `legal-insurer:naic:${naic}`,
      matchBasis: 'exact_naic_cocode_on_official_legal_insurer_spine',
    };
  }
  if (/^\d{5}$/.test(fl) && input.flCodeToNaic.has(fl)) {
    const mapped = input.flCodeToNaic.get(fl) as string;
    if (input.officialCoCodes.has(mapped)) {
      return {
        confidence: 'CONFIRMED',
        attach: true,
        kind: 'legal_insurer',
        key: `legal-insurer:naic:${mapped}`,
        matchBasis: 'exact_fl_oir_company_code_already_mapped_to_naic',
      };
    }
  }
  return {
    confidence: 'UNRESOLVED',
    attach: false,
    kind: null,
    matchBasis: input.nameOnly
      ? 'name_only_market_identity_rejected'
      : 'missing_naic_and_fl_oir_company_code',
    aggregateOk: true,
  };
}

export function decideMarketNpnIdentity(input: {
  npn?: string | null;
  entityKind: 'person' | 'agency';
  officialNpns: ReadonlySet<string>;
}): MarketIdentityDecision {
  const npn = String(input.npn || '').replace(/\D/g, '');
  if (!npn) {
    return {
      confidence: 'UNRESOLVED',
      attach: false,
      kind: null,
      matchBasis: 'missing_npn',
      aggregateOk: true,
    };
  }
  if (input.officialNpns.has(npn)) {
    return {
      confidence: 'CONFIRMED',
      attach: true,
      kind: input.entityKind,
      key: `${input.entityKind}:npn:${npn}`,
      matchBasis: 'exact_npn',
    };
  }
  return {
    confidence: 'UNRESOLVED',
    attach: false,
    kind: null,
    matchBasis: 'npn_not_on_graph',
    aggregateOk: true,
  };
}

export function observationProvenanceComplete(row: {
  sourceDataset?: string | null;
  sourceRecordId?: string | null;
  sourceClock?: string | null;
  asOf?: string | null;
  metricFamily?: string | null;
}): boolean {
  return Boolean(
    row.sourceDataset && row.sourceRecordId && row.sourceClock && row.asOf && row.metricFamily
  );
}

export type IdentityConfidenceLabel = IdentityConfidence;
