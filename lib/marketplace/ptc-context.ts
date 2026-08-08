/**
 * Educational premium tax credit context for Plan Explorer.
 * Reuses statutory 2026 FPL model — not an official Marketplace award.
 */

import { fplForHousehold } from '@/lib/tools/aca-cost-planner';
import { ACA_SAVINGS_META } from '@/lib/tools/aca-subsidy-planner';

/** Simplified applicable % of income for PTC (statutory schedule, educational). */
function applicablePercent(fplRatio: number): number | null {
  if (fplRatio < 1.0 || fplRatio > 4.0) return null;
  if (fplRatio <= 1.5) return 0;
  if (fplRatio <= 2.0) return 0 + ((fplRatio - 1.5) / 0.5) * 0.02;
  if (fplRatio <= 2.5) return 0.02 + ((fplRatio - 2.0) / 0.5) * 0.02;
  if (fplRatio <= 3.0) return 0.04 + ((fplRatio - 2.5) / 0.5) * 0.025;
  if (fplRatio <= 4.0) return 0.065 + ((fplRatio - 3.0) / 1.0) * 0.02;
  return null;
}

/**
 * Rough monthly credit estimate from a benchmark silver premium.
 * When benchmark unknown, returns null credit with explanatory note.
 */
export function educationalCreditContext(params: {
  income: number | null | undefined;
  householdSize: number;
  /** Monthly unsubsidized premium of a silver-ish plan used as rough benchmark */
  benchmarkPremiumMonthly?: number | null;
}): {
  fplPercent: number | null;
  estimatedMonthlyCredit: number | null;
  note: string;
} {
  const size = Math.max(1, Math.min(params.householdSize || 1, 14));
  if (params.income == null || !Number.isFinite(params.income) || params.income <= 0) {
    return {
      fplPercent: null,
      estimatedMonthlyCredit: null,
      note: 'Enter household income to see an educational premium tax credit context. Official awards are only on HealthCare.gov or your state marketplace.',
    };
  }

  const fpl = fplForHousehold(size);
  const fplRatio = params.income / fpl;
  const fplPercent = Math.round(fplRatio * 100);
  const pct = applicablePercent(fplRatio);

  if (pct == null) {
    if (fplRatio > 4.0) {
      return {
        fplPercent,
        estimatedMonthlyCredit: 0,
        note: `About ${fplPercent}% FPL — under the educational ${ACA_SAVINGS_META.planYear} statutory model, PTC is generally $0 above 400% FPL. Confirm on the Marketplace.`,
      };
    }
    return {
      fplPercent,
      estimatedMonthlyCredit: null,
      note: `About ${fplPercent}% FPL — check Medicaid / CHIP eligibility first. Marketplace PTC rules vary. Not a determination.`,
    };
  }

  const requiredAnnual = params.income * pct;
  const requiredMonthly = requiredAnnual / 12;
  const bench = params.benchmarkPremiumMonthly;

  if (bench == null || !Number.isFinite(bench) || bench <= 0) {
    return {
      fplPercent,
      estimatedMonthlyCredit: null,
      note: `About ${fplPercent}% FPL — educational expected contribution ≈ $${Math.round(requiredMonthly)}/mo of income. Plan-level credit needs a marketplace benchmark (SLCSP); we show full premiums until that is available from CMS.`,
    };
  }

  const credit = Math.max(0, Math.round(bench - requiredMonthly));
  return {
    fplPercent,
    estimatedMonthlyCredit: credit,
    note: `Educational only (~${fplPercent}% FPL). Rough monthly credit ≈ $${credit} using a silver-tier premium as a stand-in for SLCSP — not an official award. Verify on HealthCare.gov.`,
  };
}

export function applyCreditToPremium(
  fullPremium: number | null,
  monthlyCredit: number | null
): number | null {
  if (fullPremium == null || monthlyCredit == null) return null;
  return Math.max(0, Math.round((fullPremium - monthlyCredit) * 100) / 100);
}
