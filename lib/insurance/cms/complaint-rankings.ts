/**
 * Plan Complaint Index dataset (Phase 1).
 *
 * Source: CMS 2026 Star Ratings Data Tables — Measure Data
 * - C28: Complaints about the Health Plan (primary)
 * - D02: Complaints about the Drug Plan (fallback when C28 not reported)
 *
 * Regenerated via: `node scripts/import-cms-complaint-rankings.mjs`
 * (requires local cms-data/ download)
 */

import type {
  CmsComplaintDatasetMeta,
  CmsComplaintRanking,
  ComplaintTrend,
} from '@/lib/insurance/cms/types';
import rankingsJson from '@/lib/insurance/cms/data/complaint-rankings.json';

type RawRanking = {
  id: string;
  rank: number;
  carrierName: string;
  contractId: string;
  stateCode: string;
  stateName: string;
  complaintRatePerThousand: number;
  starRating: number | null;
  trend: ComplaintTrend;
  planType: string;
  measureUsed?: string;
  isPlaceholder: boolean;
};

type RankingsPayload = {
  meta: {
    dataVintage: string;
    syncedAt: string;
    sourceLabel: string;
    sourceDataset: string;
    usingPlaceholderData: boolean;
    totalContractsWithRate: number;
    floridaContracts: number;
    texasContracts: number;
  };
  national: RawRanking[];
  florida: RawRanking[];
  texas: RawRanking[];
  byContractId: Record<
    string,
    {
      rate: number;
      measure: string;
      carrierName: string;
      planType: string;
      starRating: number | null;
      materialStates?: string[];
    }
  >;
};

const DATA = rankingsJson as RankingsPayload;

function normalizePlanType(planType: string): CmsComplaintRanking['planType'] {
  if (
    planType === 'Part D' ||
    planType === 'MA-PD' ||
    planType === 'Medicare Advantage' ||
    planType === 'Other'
  ) {
    return planType;
  }
  return 'Other';
}

function toRanking(row: RawRanking): CmsComplaintRanking {
  return {
    id: row.id,
    rank: row.rank,
    carrierName: row.carrierName,
    contractId: row.contractId,
    stateCode: row.stateCode,
    stateName: row.stateName,
    complaintRatePerThousand: row.complaintRatePerThousand,
    starRating: row.starRating,
    trend: row.trend,
    planType: normalizePlanType(row.planType),
    isPlaceholder: false,
  };
}

/** Dataset provenance — updated by import-cms-complaint-rankings.mjs */
export const CMS_COMPLAINT_DATASET_META: CmsComplaintDatasetMeta = {
  dataVintage: DATA.meta.dataVintage,
  syncedAt: DATA.meta.syncedAt,
  sourceLabel: DATA.meta.sourceLabel,
  sourceDataset: DATA.meta.sourceDataset,
  methodologyNotes: [
    'Complaint rates come from the CMS 2026 Star Ratings Measure Data table: C28 (Complaints about the Health Plan) when reported; otherwise D02 (Complaints about the Drug Plan).',
    'Measurement period for C28/D02 in the 2026 Star Ratings package is calendar-year 2024 (01/01/2024 – 12/31/2024), published in the 2026 Star Ratings data tables.',
    'Rankings sort by lowest complaint rate first. Zero is a real CMS-reported rate, not missing data.',
    'State tabs (Florida / Texas) include contracts with at least 50 published enrollees in that state in the July 2026 Monthly Enrollment by Contract/Plan/State/County file. National PDP contracts that enroll beneficiaries in those states may appear.',
    'Employer/union-only direct contracts are excluded from consumer-facing rankings.',
    'Trend compares the same contract’s 2026 vs 2025 Star Ratings complaint measure (improving = lower rate).',
    'Star values shown are the CMS star for the complaint measure (C28/D02), not always the overall Part C/D summary rating.',
    'Contract-level rates can differ from plan-level marketing names; parent organizations may operate multiple contracts.',
    'This index is educational transparency content only — not an endorsement and not a sole measure of quality.',
  ],
  usingPlaceholderData: DATA.meta.usingPlaceholderData === true,
};

export type ComplaintIndexScope = 'US' | 'FL' | 'TX';

export function getComplaintRankings(scope: ComplaintIndexScope = 'US'): CmsComplaintRanking[] {
  if (scope === 'FL') return DATA.florida.map(toRanking);
  if (scope === 'TX') return DATA.texas.map(toRanking);
  return DATA.national.map(toRanking);
}

export function getComplaintIndexScopes(): {
  id: ComplaintIndexScope;
  label: string;
  description: string;
}[] {
  return [
    {
      id: 'US',
      label: 'National',
      description: 'CMS contracts with reported complaint rates, ranked lowest rate first',
    },
    {
      id: 'FL',
      label: 'Florida',
      description: 'Contracts with material published Florida enrollment (July 2026 CPSC)',
    },
    {
      id: 'TX',
      label: 'Texas',
      description: 'Contracts with material published Texas enrollment (July 2026 CPSC)',
    },
  ];
}

export function formatComplaintRate(rate: number): string {
  if (!Number.isFinite(rate)) return '—';
  if (rate > 0 && rate < 0.01) return rate.toFixed(3);
  return rate.toFixed(2);
}

export function getComplaintRateByContractId(contractId: string | null | undefined): number | null {
  if (!contractId) return null;
  const key = contractId.trim().toUpperCase();
  const row = DATA.byContractId[key] ?? DATA.byContractId[contractId.trim()];
  return row?.rate ?? null;
}

export function getComplaintContractMeta(contractId: string | null | undefined) {
  if (!contractId) return null;
  const key = contractId.trim().toUpperCase();
  return DATA.byContractId[key] ?? DATA.byContractId[contractId.trim()] ?? null;
}
