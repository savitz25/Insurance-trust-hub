/**
 * Plan Complaint Index dataset (Phase 1).
 *
 * Production path: scheduled import of CMS Part C & D complaint rate public files
 * into this shape (or Supabase table), versioned by dataVintage + syncedAt.
 *
 * Current rows are **structural seed data** clearly flagged `isPlaceholder: true`
 * so the page ships complete UX + SEO while awaiting the first CMS file load.
 *
 * Required import fields (from CMS public complaint rate files):
 * - contract_id
 * - organization_name / parent_organization
 * - complaints_per_1000_enrollees (or equivalent measure)
 * - measurement_year / data_vintage
 * - optional: overall_star_rating, enrollment, state_service_area
 */

import type { CmsComplaintDatasetMeta, CmsComplaintRanking } from '@/lib/insurance/cms/types';

/** Dataset provenance — update when real CMS import lands. */
export const CMS_COMPLAINT_DATASET_META: CmsComplaintDatasetMeta = {
  dataVintage: 'CY2024',
  syncedAt: '2026-07-01T00:00:00.000Z',
  sourceLabel: 'CMS Part C & D Complaint Rates (public files)',
  sourceDataset:
    'Medicare Advantage and Prescription Drug Plan Complaint Rates — contract-level measures',
  methodologyNotes: [
    'Rankings use complaints per 1,000 enrollees (CMS contract-level measure) when imported from public CMS files.',
    'Contract-level rates can differ from plan-level marketing names; parent organizations may operate multiple contracts.',
    'Lower rates generally indicate fewer complaints relative to enrollment; this is not a sole measure of quality.',
    'Star ratings, when shown, are overall CMS ratings for context only and may reflect a different measurement period.',
    'Phase 1 may display clearly labeled placeholder rankings until the first scheduled CMS file import completes.',
  ],
  usingPlaceholderData: true,
};

/**
 * Illustrative national + Florida-heavy seed for layout/QA.
 * Replace via import script; do not treat as live CMS numbers in editorial copy.
 */
const SEED: Omit<CmsComplaintRanking, 'rank'>[] = [
  // Florida focus
  {
    id: 'fl-01',
    carrierName: 'Sunshine Health Partners (illustrative)',
    contractId: 'H0001',
    stateCode: 'FL',
    stateName: 'Florida',
    complaintRatePerThousand: 0.04,
    starRating: 4.5,
    trend: 'improving',
    planType: 'MA-PD',
    isPlaceholder: true,
  },
  {
    id: 'fl-02',
    carrierName: 'Gulf Coast Medicare Advantage (illustrative)',
    contractId: 'H0002',
    stateCode: 'FL',
    stateName: 'Florida',
    complaintRatePerThousand: 0.07,
    starRating: 4.0,
    trend: 'stable',
    planType: 'Medicare Advantage',
    isPlaceholder: true,
  },
  {
    id: 'fl-03',
    carrierName: 'Atlantic Rx PDP (illustrative)',
    contractId: 'S0003',
    stateCode: 'FL',
    stateName: 'Florida',
    complaintRatePerThousand: 0.09,
    starRating: 3.5,
    trend: 'stable',
    planType: 'Part D',
    isPlaceholder: true,
  },
  {
    id: 'fl-04',
    carrierName: 'Everglades Senior Care (illustrative)',
    contractId: 'H0004',
    stateCode: 'FL',
    stateName: 'Florida',
    complaintRatePerThousand: 0.12,
    starRating: 3.5,
    trend: 'worsening',
    planType: 'MA-PD',
    isPlaceholder: true,
  },
  {
    id: 'fl-05',
    carrierName: 'Panhandle Health Options (illustrative)',
    contractId: 'H0005',
    stateCode: 'FL',
    stateName: 'Florida',
    complaintRatePerThousand: 0.15,
    starRating: 3.0,
    trend: 'stable',
    planType: 'Medicare Advantage',
    isPlaceholder: true,
  },
  {
    id: 'fl-06',
    carrierName: 'Treasure Coast Medicare (illustrative)',
    contractId: 'H0006',
    stateCode: 'FL',
    stateName: 'Florida',
    complaintRatePerThousand: 0.18,
    starRating: 3.0,
    trend: 'improving',
    planType: 'MA-PD',
    isPlaceholder: true,
  },
  {
    id: 'fl-07',
    carrierName: 'Space Coast Advantage (illustrative)',
    contractId: 'H0007',
    stateCode: 'FL',
    stateName: 'Florida',
    complaintRatePerThousand: 0.22,
    starRating: 2.5,
    trend: 'worsening',
    planType: 'Medicare Advantage',
    isPlaceholder: true,
  },
  {
    id: 'fl-08',
    carrierName: 'Suncoast Part D Select (illustrative)',
    contractId: 'S0008',
    stateCode: 'FL',
    stateName: 'Florida',
    complaintRatePerThousand: 0.28,
    starRating: 2.5,
    trend: 'unknown',
    planType: 'Part D',
    isPlaceholder: true,
  },
  // National / multi-state illustrative
  {
    id: 'us-01',
    carrierName: 'National Senior Advantage A (illustrative)',
    contractId: 'H1001',
    stateCode: 'US',
    stateName: 'National',
    complaintRatePerThousand: 0.05,
    starRating: 4.5,
    trend: 'stable',
    planType: 'MA-PD',
    isPlaceholder: true,
  },
  {
    id: 'us-02',
    carrierName: 'National Senior Advantage B (illustrative)',
    contractId: 'H1002',
    stateCode: 'US',
    stateName: 'National',
    complaintRatePerThousand: 0.08,
    starRating: 4.0,
    trend: 'improving',
    planType: 'Medicare Advantage',
    isPlaceholder: true,
  },
  {
    id: 'us-03',
    carrierName: 'Nationwide Rx PDP (illustrative)',
    contractId: 'S1003',
    stateCode: 'US',
    stateName: 'National',
    complaintRatePerThousand: 0.11,
    starRating: 3.5,
    trend: 'stable',
    planType: 'Part D',
    isPlaceholder: true,
  },
  {
    id: 'us-04',
    carrierName: 'Continental Health MA (illustrative)',
    contractId: 'H1004',
    stateCode: 'US',
    stateName: 'National',
    complaintRatePerThousand: 0.14,
    starRating: 3.5,
    trend: 'worsening',
    planType: 'MA-PD',
    isPlaceholder: true,
  },
  {
    id: 'us-05',
    carrierName: 'Heartland Medicare Group (illustrative)',
    contractId: 'H1005',
    stateCode: 'US',
    stateName: 'National',
    complaintRatePerThousand: 0.19,
    starRating: 3.0,
    trend: 'stable',
    planType: 'Medicare Advantage',
    isPlaceholder: true,
  },
  {
    id: 'us-06',
    carrierName: 'Pacific Coast Advantage (illustrative)',
    contractId: 'H1006',
    stateCode: 'US',
    stateName: 'National',
    complaintRatePerThousand: 0.24,
    starRating: 2.5,
    trend: 'improving',
    planType: 'MA-PD',
    isPlaceholder: true,
  },
  // Texas sample tab
  {
    id: 'tx-01',
    carrierName: 'Lone Star Medicare Advantage (illustrative)',
    contractId: 'H2001',
    stateCode: 'TX',
    stateName: 'Texas',
    complaintRatePerThousand: 0.06,
    starRating: 4.0,
    trend: 'stable',
    planType: 'MA-PD',
    isPlaceholder: true,
  },
  {
    id: 'tx-02',
    carrierName: 'Hill Country Senior Care (illustrative)',
    contractId: 'H2002',
    stateCode: 'TX',
    stateName: 'Texas',
    complaintRatePerThousand: 0.13,
    starRating: 3.5,
    trend: 'improving',
    planType: 'Medicare Advantage',
    isPlaceholder: true,
  },
  {
    id: 'tx-03',
    carrierName: 'Rio Grande Part D (illustrative)',
    contractId: 'S2003',
    stateCode: 'TX',
    stateName: 'Texas',
    complaintRatePerThousand: 0.21,
    starRating: 3.0,
    trend: 'unknown',
    planType: 'Part D',
    isPlaceholder: true,
  },
];

function rankRows(rows: Omit<CmsComplaintRanking, 'rank'>[]): CmsComplaintRanking[] {
  const sorted = [...rows].sort(
    (a, b) => a.complaintRatePerThousand - b.complaintRatePerThousand
  );
  return sorted.map((row, i) => ({ ...row, rank: i + 1 }));
}

export type ComplaintIndexScope = 'US' | 'FL' | 'TX';

export function getComplaintRankings(scope: ComplaintIndexScope = 'US'): CmsComplaintRanking[] {
  if (scope === 'US') {
    // National view: all seed rows re-ranked together
    return rankRows(SEED);
  }
  return rankRows(SEED.filter((r) => r.stateCode === scope));
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
      description: 'All contracts in the current dataset, ranked by complaint rate',
    },
    {
      id: 'FL',
      label: 'Florida',
      description: 'Florida-focused contracts — priority market for Phase 1',
    },
    {
      id: 'TX',
      label: 'Texas',
      description: 'Additional state sample for multi-market comparison',
    },
  ];
}

export function formatComplaintRate(rate: number): string {
  return rate.toFixed(2);
}
