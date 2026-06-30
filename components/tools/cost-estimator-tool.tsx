'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Calculator, AlertTriangle } from 'lucide-react';
import { US_STATES, INSURANCE_TYPES } from '@/lib/constants';
import { formatPremiumRange, getPremiumRange } from '@/lib/tools/cost-estimates';
import type { InsuranceType } from '@/lib/constants';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function CostEstimatorTool() {
  const [state, setState] = useState('FL');
  const [type, setType] = useState<InsuranceType>('auto');
  const [showResult, setShowResult] = useState(false);

  const range = showResult ? getPremiumRange(state, type) : null;
  const typeLabel = INSURANCE_TYPES.find((t) => t.value === type)?.label ?? type;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calculator className="h-5 w-5 text-primary" />
            Estimate your premiums
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="est-state">State</Label>
              <Select
                id="est-state"
                className="mt-1.5"
                value={state}
                onChange={(e) => {
                  setState(e.target.value);
                  setShowResult(false);
                }}
              >
                {US_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="est-type">Insurance type</Label>
              <Select
                id="est-type"
                className="mt-1.5"
                value={type}
                onChange={(e) => {
                  setType(e.target.value as InsuranceType);
                  setShowResult(false);
                }}
              >
                {INSURANCE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <Button onClick={() => setShowResult(true)} className="min-h-[44px]">
            Calculate estimate
          </Button>
        </CardContent>
      </Card>

      {range && (
        <Card className="border-trust/30 bg-trust/5">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Estimated annual range for {typeLabel}</p>
            <p className="mt-2 text-3xl font-bold text-primary">{formatPremiumRange(range)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Median: ${range.median.toLocaleString()}/{range.unit === 'year' ? 'yr' : 'mo'}
            </p>
            {range.notes && (
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{range.notes}</p>
            )}
            <Button asChild className="mt-4" variant="outline">
              <Link href={`/directory?state=${state}&type=${type}`}>
                Find agents in {US_STATES.find((s) => s.code === state)?.name}
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" aria-hidden="true" />
        <p>
          <strong>Estimates only.</strong> Actual premiums depend on age, credit, claims history,
          coverage limits, deductibles, and carrier appetite. Use this tool for planning — always
          request personalized quotes from licensed agents.
        </p>
      </div>
    </div>
  );
}