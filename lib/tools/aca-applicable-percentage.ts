/**
 * 2026 premium tax credit applicable percentage (percent of household income).
 *
 * Source: IRS Rev. Proc. 2025-25, §3.01, Applicable Percentage Table for
 * taxable years beginning in calendar year 2026, for purposes of IRC
 * §36B(b)(3)(A)(i) and Treas. Reg. §1.36B-3(g). Published in 2025-32 I.R.B. 311
 * and at https://www.irs.gov/pub/irs-drop/rp-25-25.pdf
 * (also https://www.irs.gov/irb/2025-32_IRB).
 *
 * Official rows (initial percentage → final percentage):
 *   Less than 133% of the federal poverty line          2.10% → 2.10%
 *   At least 133% but less than 150%                    3.14% → 4.19%
 *   At least 150% but less than 200%                    4.19% → 6.60%
 *   At least 200% but less than 250%                    6.60% → 8.44%
 *   At least 250% but less than 300%                    8.44% → 9.96%
 *   At least 300% but not more than 400%                9.96% → 9.96%
 *
 * Bands are half-open (lower edge inclusive, upper edge exclusive) except the
 * final row, which includes 400% ("not more than 400%"). Income above 400% of
 * the federal poverty line is outside the table, so there is no premium tax
 * credit. That matches the pre-existing calculator cutoff (`fplRatio > 4`).
 *
 * Inside a sliding band, Treas. Reg. §1.36B-3(g) increases the percentage in a
 * linear manner from the initial percentage at the bottom of the range to the
 * final percentage at the top:
 *   initial + (final − initial) × (income% − bottom) / (top − bottom).
 *
 * §3.02 of the same revenue procedure sets the required contribution
 * percentage for employer-coverage affordability at 9.96%. That figure is not
 * an additional PTC band; the 300–400% PTC row is independently flat at 9.96%.
 *
 * Household income under 100% of the federal poverty line is outside the
 * Marketplace premium-tax-credit range this educational model uses (the IRS
 * row "less than 133%" is flat 2.10%, but these calculators still treat under
 * 100% as ineligible). Callers keep their existing sentinels: the cost planner
 * returns 100, and the subsidy planner and plan-explorer context return null.
 */

export const ACA_2026_APPLICABLE_PERCENTAGE_SOURCE =
  'IRS Rev. Proc. 2025-25, §3.01 (2025-32 I.R.B. 311)' as const;

type ApplicablePercentageBand = {
  /** Lower edge as a percent of FPL, inclusive. */
  lowerInclusive: number;
  /** Upper edge as a percent of FPL. Exclusive unless `upperInclusive`. */
  upper: number;
  upperInclusive: boolean;
  /** Initial percentage of household income. */
  initial: number;
  /** Final percentage of household income. */
  final: number;
};

/** Rev. Proc. 2025-25 §3.01, in household-income percent of FPL. */
export const ACA_2026_APPLICABLE_PERCENTAGE_BANDS: readonly ApplicablePercentageBand[] = [
  { lowerInclusive: 100, upper: 133, upperInclusive: false, initial: 2.1, final: 2.1 },
  { lowerInclusive: 133, upper: 150, upperInclusive: false, initial: 3.14, final: 4.19 },
  { lowerInclusive: 150, upper: 200, upperInclusive: false, initial: 4.19, final: 6.6 },
  { lowerInclusive: 200, upper: 250, upperInclusive: false, initial: 6.6, final: 8.44 },
  { lowerInclusive: 250, upper: 300, upperInclusive: false, initial: 8.44, final: 9.96 },
  { lowerInclusive: 300, upper: 400, upperInclusive: true, initial: 9.96, final: 9.96 },
] as const;

const PTC_MIN_FPL_PERCENT = 100;
const PTC_MAX_FPL_PERCENT = 400;

function inBand(fplPercent: number, band: ApplicablePercentageBand): boolean {
  if (fplPercent < band.lowerInclusive) return false;
  if (band.upperInclusive) return fplPercent <= band.upper;
  return fplPercent < band.upper;
}

function interpolate(fplPercent: number, band: ApplicablePercentageBand): number {
  if (band.final === band.initial || band.upper === band.lowerInclusive) return band.initial;
  const t = (fplPercent - band.lowerInclusive) / (band.upper - band.lowerInclusive);
  return band.initial + (band.final - band.initial) * t;
}

/**
 * Applicable percentage of household income for plan year 2026.
 *
 * @param fplRatio Household income divided by the applicable poverty guideline
 *   (1.33 means 133% of FPL).
 * @returns Percentage points (2.10 means 2.10% of income), or null when income
 *   is below 100% of FPL or above 400% of FPL.
 */
export function aca2026ApplicablePercentage(fplRatio: number): number | null {
  if (!Number.isFinite(fplRatio)) return null;
  const fplPercent = fplRatio * 100;
  if (fplPercent < PTC_MIN_FPL_PERCENT || fplPercent > PTC_MAX_FPL_PERCENT) return null;
  for (const band of ACA_2026_APPLICABLE_PERCENTAGE_BANDS) {
    if (inBand(fplPercent, band)) return interpolate(fplPercent, band);
  }
  return null;
}
