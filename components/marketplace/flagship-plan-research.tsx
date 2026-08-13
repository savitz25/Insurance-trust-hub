'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ExternalLink,
  Loader2,
  MapPin,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { resolveZip } from '@/lib/tools/zip-resolve';
import type { LocalMarketplaceLandscape } from '@/lib/marketplace/plans-search';
import { MARKETPLACE_PLAN_YEAR_DEFAULT } from '@/lib/marketplace/types';
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
import type { MarketplaceDataSource } from '@/lib/tools/apply-marketplace-landscape';
import { applyLandscapeToCostPlanner } from '@/lib/tools/apply-marketplace-landscape';

/**
 * ZIP-first flagship research module for /tools/marketplace-plan-research.
 * Reuses landscape API + Phase 2 snapshot/path cards + Phase 3 save.
 */
export function FlagshipPlanResearch() {
  const [zip, setZip] = useState('');
  const [age, setAge] = useState(40);
  const [income, setIncome] = useState('48000');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [landscape, setLandscape] = useState<LocalMarketplaceLandscape | null>(null);

  async function runResearch() {
    setError(null);
    const digits = zip.replace(/\D/g, '').slice(0, 5);
    if (digits.length !== 5) {
      setError('Enter a valid 5-digit U.S. ZIP code.');
      setLandscape(null);
      return;
    }
    const loc = resolveZip(digits);
    if (!loc) {
      setError('We could not map that ZIP. Try another U.S. ZIP.');
      setLandscape(null);
      return;
    }

    setLoading(true);
    try {
      const annualIncome = Math.max(0, Number(String(income).replace(/,/g, '')) || 0);
      const res = await fetch('/api/marketplace/landscape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          zip: digits,
          year: MARKETPLACE_PLAN_YEAR_DEFAULT,
          ages: [age],
          householdIncome: annualIncome > 0 ? annualIncome : null,
          householdSize: 1,
        }),
      });
      const data = (await res.json()) as LocalMarketplaceLandscape;
      setLandscape(data);
      if (!data.ok && data.errorMessage) {
        setError(null); // surface via honesty / fallback UI
      }
    } catch {
      setError('Network error loading Marketplace landscape. Try again.');
      setLandscape(null);
    } finally {
      setLoading(false);
    }
  }

  const loc = zip.replace(/\D/g, '').length === 5 ? resolveZip(zip) : null;
  const annualIncome = Math.max(0, Number(String(income).replace(/,/g, '')) || 0);

  let marketplace: MarketplaceDataSource | null = null;
  let saveSnapshot = null as ReturnType<typeof toCalculatorSnapshot> | null;
  let saveTitle = '';

  if (loc && landscape) {
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
    marketplace = merged.marketplace;
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
    saveSnapshot = toCalculatorSnapshot(research, '/tools/marketplace-plan-research');
    saveTitle = `Marketplace research · ${loc.displayLabel}`;
  }

  return (
    <div className="space-y-8">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#0284C7]">
          Local Marketplace research
        </p>
        <h2 className="mt-1 text-xl font-semibold text-slate-900">Start with your ZIP</h2>
        <p className="mt-1 text-sm text-slate-600">
          We load a CMS Marketplace landscape for your area when the API is available. Educational
          only — not enrollment.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <Label htmlFor="flagship-zip">ZIP code</Label>
            <div className="relative mt-1.5">
              <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="flagship-zip"
                inputMode="numeric"
                maxLength={5}
                placeholder="33139"
                className="pl-9"
                value={zip}
                onChange={(e) => setZip(e.target.value.replace(/\D/g, '').slice(0, 5))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void runResearch();
                }}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="flagship-age">Your age</Label>
            <Input
              id="flagship-age"
              type="number"
              min={0}
              max={64}
              className="mt-1.5"
              value={age}
              onChange={(e) => setAge(Math.min(64, Math.max(0, Number(e.target.value) || 0)))}
            />
          </div>
          <div>
            <Label htmlFor="flagship-income">Household income (optional)</Label>
            <Input
              id="flagship-income"
              inputMode="numeric"
              className="mt-1.5"
              placeholder="48000"
              value={income}
              onChange={(e) => setIncome(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button
            type="button"
            className="min-h-[44px] gap-2"
            onClick={() => void runResearch()}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <Search className="h-4 w-4" aria-hidden />
            )}
            {loading ? 'Loading landscape…' : 'Research Marketplace plans near you'}
          </Button>
          <p className="text-xs text-slate-500">
            Plan year {MARKETPLACE_PLAN_YEAR_DEFAULT} · independent research
          </p>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
            {error}
          </p>
        ) : null}
      </div>

      {landscape && marketplace ? (
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
              {saveSnapshot ? (
                <SaveCalculatorButton
                  calculatorId="marketplace_research"
                  title={saveTitle}
                  snapshot={saveSnapshot}
                  sendEmail
                />
              ) : null}
              <Button asChild variant="default" className="min-h-[44px] gap-1">
                <a
                  href="https://www.healthcare.gov"
                  target="_blank"
                  rel="noopener noreferrer"
                >
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
            <Link
              href="/calculators/aca-subsidy"
              className="font-medium text-[#0284C7] hover:underline"
            >
              ACA Savings Planner
            </Link>
            .
          </p>
        </div>
      ) : null}
    </div>
  );
}
