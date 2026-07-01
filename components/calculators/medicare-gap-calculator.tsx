'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';

const SCENARIOS = [
  { value: 'moving', label: 'Moving to a new state' },
  { value: 'retiring', label: 'Retiring from employer coverage' },
  { value: 'turning65', label: 'Turning 65 soon' },
  { value: 'losing-job', label: 'Losing job-based health insurance' },
];

export function MedicareGapCalculator() {
  const [scenario, setScenario] = useState('moving');
  const [result, setResult] = useState<string | null>(null);

  function analyze() {
    const advice: Record<string, string> = {
      moving:
        'Moving states may require new Medicare Advantage network selection or Medigap guaranteed-issue window check. You have 63 days for Medicare Special Enrollment if you had employer coverage. Verify Part D formulary changes for your prescriptions in the new state.',
      retiring:
        'Employer coverage ending triggers an 8-month Part B Special Enrollment Period. Compare Medigap Plan G/N vs. Medicare Advantage in your county before your employer COBRA ends to avoid late-enrollment penalties.',
      turning65:
        'Initial Enrollment Period spans 3 months before/after your 65th birthday month. If still working with qualifying employer coverage, you may delay Part B — confirm with HR before declining.',
      'losing-job':
        'ACA marketplace may bridge gaps if you are under 65. If 65+, file for Part B immediately and compare Medigap open enrollment. COBRA extends employer plan but does not replace Medicare enrollment timing rules.',
    };
    setResult(advice[scenario] ?? advice.moving);
  }

  return (
    <div className="max-w-lg space-y-4">
      <div>
        <Label htmlFor="gap-scenario">Your situation</Label>
        <Select id="gap-scenario" value={scenario} onChange={(e) => setScenario(e.target.value)} className="mt-1">
          {SCENARIOS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </Select>
      </div>
      <Button onClick={analyze} variant="trust">Analyze Coverage Gaps</Button>
      {result && (
        <div className="rounded-lg border p-4 text-sm space-y-2">
          <p className="font-semibold text-trust">Guidance (not legal/medical advice)</p>
          <p className="text-muted-foreground">{result}</p>
          <p className="text-xs text-muted-foreground">
            Always confirm enrollment windows at Medicare.gov and with a licensed Medicare specialist.
          </p>
        </div>
      )}
    </div>
  );
}