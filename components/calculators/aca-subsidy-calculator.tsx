'use client';

import { useState } from 'react';
import { US_STATES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

export function AcaSubsidyCalculator() {
  const [income, setIncome] = useState('55000');
  const [household, setHousehold] = useState('2');
  const [state, setState] = useState('FL');
  const [result, setResult] = useState<string | null>(null);

  function estimate() {
    const inc = Number(income) || 0;
    const hh = Number(household) || 1;
    const fpl = 15060 + (hh - 1) * 5380;
    const ratio = inc / fpl;

    if (ratio <= 1.5) {
      setResult(
        `Estimated eligibility for enhanced subsidies in ${state}. At ${ratio.toFixed(1)}x FPL, you may qualify for low- or zero-premium benchmark plans. Verify at HealthCare.gov or your state marketplace.`
      );
    } else if (ratio <= 4.0) {
      const subsidyPct = Math.max(0, Math.round((4 - ratio) * 15));
      setResult(
        `Rough estimate: ${subsidyPct}% premium tax credit possible in ${state} at ${ratio.toFixed(1)}x federal poverty level. Actual subsidy depends on benchmark plan, age, and ZIP. This is not official CMS data.`
      );
    } else {
      setResult(
        `At ${ratio.toFixed(1)}x FPL, marketplace subsidies may be limited or unavailable in ${state}. Consider employer coverage, COBRA, or off-exchange plans. Consult a licensed ACA navigator.`
      );
    }
  }

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <Label htmlFor="aca-income">Annual household income ($)</Label>
        <Input id="aca-income" type="number" value={income} onChange={(e) => setIncome(e.target.value)} className="mt-1" />
      </div>
      <div>
        <Label htmlFor="aca-household">Household size</Label>
        <Input id="aca-household" type="number" min={1} max={8} value={household} onChange={(e) => setHousehold(e.target.value)} className="mt-1" />
      </div>
      <div>
        <Label htmlFor="aca-state">State</Label>
        <Select id="aca-state" value={state} onChange={(e) => setState(e.target.value)} className="mt-1">
          {US_STATES.map((s) => (
            <option key={s.code} value={s.code}>{s.name}</option>
          ))}
        </Select>
      </div>
      <Button onClick={estimate} variant="trust">Estimate Subsidy</Button>
      {result && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-foreground">
          <p className="font-semibold text-amber-800">Estimate only</p>
          <p className="mt-1">{result}</p>
        </div>
      )}
    </div>
  );
}