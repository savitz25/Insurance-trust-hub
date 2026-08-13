'use client';

import Link from 'next/link';
import { ExternalLink, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { resolveZip } from '@/lib/tools/zip-resolve';
import type { LocalMarketplaceLandscape } from '@/lib/marketplace/plans-search';
import { MarketplaceHonestyBanner } from '@/components/marketplace/marketplace-honesty-banner';
import { MarketSnapshot } from '@/components/marketplace/market-snapshot';
import {
  LandscapeNarrative,
  ResearchPathCards,
} from '@/components/marketplace/research-path-cards';
import { SaveCalculatorButton } from '@/components/my-insurance/save-calculator-button';
import {
  buildCostPlannerResearchSnapshot,
  toCalculatorSnapshot,
} from '@/lib/marketplace/research-snapshot';
import { buildPlannerResult } from '@/lib/tools/aca-cost-planner';
import { applyLandscapeToCostPlanner } from '@/lib/tools/apply-marketplace-landscape';

export function FlagshipPlanResults({
  landscape,
  zip,
  age,
  income,
}: {
  landscape: LocalMarketplaceLandscape;
  zip: string;
  age: number;
  income: string;
}) {
  const loc = zip.replace(/\D/g, '').length === 5 ? resolveZip(zip) : null;
  const annualIncome = Math.max(0, Number(String(income).replace(/,/g, '')) || 0);
  if (!loc) return null;

  const base = buildPlannerResult({
    situation: 'shopping-aca',
    location: loc,
    householdShape: 'just-me',
    people: [{ age }],
    householdSize: 1,
    annualIncome: annualIncome > 0 ? annualIncome : null,
    utilization: 'moderate',
    prescriptions: false,
    majorCare: false,
    priority: 'balanced',
  });
  const merged = applyLandscapeToCostPlanner(base, landscape);
  const marketplace = merged.marketplace;
  const research = {
    ...buildCostPlannerResearchSnapshot({
      result: merged,
      landscape,
      ages: [age],
      householdSize: 1,
      tobacco: false,
      utilization: 'moderate',
    }),
    toolKey: 'marketplace_research' as const,
    toolLabel: 'Marketplace Plan Research',
  };
  const saveSnapshot = toCalculatorSnapshot(research, '/tools/marketplace-plan-research');
  const saveTitle = `Marketplace research · ${loc.displayLabel}`;

  return (
    <div className="space-y-6">
      <MarketplaceHonestyBanner marketplace={marketplace} />
      <MarketSnapshot landscape={landscape} />
      <LandscapeNarrative landscape={landscape} />
      <ResearchPathCards landscape={landscape} />

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between md:p-5">
        <div className="min-w-0">
          <p className="font-semibold text-slate-900">Keep this research</p>
          <p className="mt-0.5 text-sm text-slate-600">
            Save a summary to My Insurance, or continue on HealthCare.gov for official options.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <SaveCalculatorButton
            calculatorId="marketplace_research"
            title={saveTitle}
            snapshot={saveSnapshot}
            sendEmail
          />
          <Button asChild variant="default" className="min-h-[44px] gap-1">
            <a href="https://www.healthcare.gov" target="_blank" rel="noopener noreferrer">
              Continue on HealthCare.gov
              <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          </Button>
        </div>
      </div>

      <p className="flex items-start gap-2 text-xs text-slate-500">
        <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        Want deeper total-cost scenarios or PTC cliff education? Use the{' '}
        <Link href="/tools/cost-estimator" className="font-medium text-[#0284C7] hover:underline">
          Cost Planner
        </Link>{' '}
        or{' '}
        <Link href="/calculators/aca-subsidy" className="font-medium text-[#0284C7] hover:underline">
          ACA Savings Planner
        </Link>
        .
      </p>
    </div>
  );
}
