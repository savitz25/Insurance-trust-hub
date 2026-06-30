import type { InsuranceType } from '@/lib/constants';

export interface PremiumRange {
  low: number;
  high: number;
  median: number;
  unit: 'year' | 'month';
  notes?: string;
}

export interface StateCostEstimate {
  state: string;
  stateCode: string;
  auto: PremiumRange;
  home: PremiumRange;
  renters: PremiumRange;
  life?: PremiumRange;
}

const BASE_ESTIMATES: Record<string, Omit<StateCostEstimate, 'state' | 'stateCode'>> = {
  FL: {
    auto: { low: 2100, high: 3600, median: 2800, unit: 'year', notes: 'PIP and hurricane-prone counties increase rates' },
    home: { low: 2000, high: 5500, median: 3200, unit: 'year', notes: 'Wind and flood often require separate policies' },
    renters: { low: 180, high: 350, median: 240, unit: 'year' },
    life: { low: 300, high: 900, median: 520, unit: 'year', notes: 'Term life, healthy 35-year-old, $500k' },
  },
  TX: {
    auto: { low: 1600, high: 2600, median: 2000, unit: 'year' },
    home: { low: 1800, high: 3800, median: 2600, unit: 'year', notes: 'Hail-prone areas may see higher deductibles' },
    renters: { low: 150, high: 280, median: 195, unit: 'year' },
    life: { low: 280, high: 850, median: 480, unit: 'year' },
  },
  CA: {
    auto: { low: 1900, high: 3200, median: 2400, unit: 'year' },
    home: { low: 1200, high: 3500, median: 1800, unit: 'year', notes: 'Wildfire zones significantly affect availability' },
    renters: { low: 160, high: 320, median: 220, unit: 'year' },
    life: { low: 320, high: 950, median: 540, unit: 'year' },
  },
  NY: {
    auto: { low: 1800, high: 4200, median: 2600, unit: 'year', notes: 'NYC metro rates exceed upstate averages' },
    home: { low: 900, high: 2800, median: 1500, unit: 'year' },
    renters: { low: 140, high: 300, median: 210, unit: 'year' },
    life: { low: 300, high: 920, median: 510, unit: 'year' },
  },
  NC: {
    auto: { low: 1200, high: 2000, median: 1550, unit: 'year' },
    home: { low: 1000, high: 2400, median: 1450, unit: 'year' },
    renters: { low: 120, high: 240, median: 165, unit: 'year' },
    life: { low: 260, high: 800, median: 450, unit: 'year' },
  },
  IL: {
    auto: { low: 1300, high: 2800, median: 1850, unit: 'year' },
    home: { low: 950, high: 2400, median: 1400, unit: 'year' },
    renters: { low: 130, high: 260, median: 175, unit: 'year' },
    life: { low: 270, high: 820, median: 460, unit: 'year' },
  },
};

const NATIONAL_DEFAULT: Omit<StateCostEstimate, 'state' | 'stateCode'> = {
  auto: { low: 1400, high: 2400, median: 1800, unit: 'year' },
  home: { low: 1100, high: 2800, median: 1650, unit: 'year' },
  renters: { low: 130, high: 260, median: 180, unit: 'year' },
  life: { low: 280, high: 880, median: 490, unit: 'year' },
};

const STATE_NAMES: Record<string, string> = {
  FL: 'Florida',
  TX: 'Texas',
  CA: 'California',
  NY: 'New York',
  NC: 'North Carolina',
  IL: 'Illinois',
};

export function getStateCostEstimate(stateCode: string): StateCostEstimate {
  const code = stateCode.toUpperCase();
  const base = BASE_ESTIMATES[code] ?? NATIONAL_DEFAULT;
  return {
    state: STATE_NAMES[code] ?? code,
    stateCode: code,
    ...base,
  };
}

export function getPremiumRange(
  stateCode: string,
  insuranceType: InsuranceType
): PremiumRange {
  const estimate = getStateCostEstimate(stateCode);

  switch (insuranceType) {
    case 'auto':
      return estimate.auto;
    case 'homeowners':
      return estimate.home;
    case 'renters':
      return estimate.renters;
    case 'life':
      return estimate.life ?? NATIONAL_DEFAULT.life!;
    case 'health':
      return { low: 2400, high: 7200, median: 4200, unit: 'year', notes: 'Individual ACA marketplace, varies by age and subsidies' };
    case 'medicare':
      return { low: 0, high: 4800, median: 1800, unit: 'year', notes: 'Medicare Advantage or supplement plans; Part A/B eligibility varies' };
    case 'umbrella':
      return { low: 150, high: 400, median: 250, unit: 'year', notes: '$1M umbrella, requires underlying auto/home' };
    case 'flood':
      return { low: 400, high: 2500, median: 950, unit: 'year', notes: 'NFIP or private flood, zone-dependent' };
    default:
      return estimate.auto;
  }
}

export function formatPremiumRange(range: PremiumRange): string {
  const period = range.unit === 'year' ? '/yr' : '/mo';
  return `$${range.low.toLocaleString()}–$${range.high.toLocaleString()}${period}`;
}