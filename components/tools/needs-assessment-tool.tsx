'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ClipboardCheck, ArrowRight } from 'lucide-react';
import {
  ASSESSMENT_QUESTIONS,
  computeAssessment,
} from '@/lib/tools/needs-assessment';
import { INSURANCE_TYPES } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function NeedsAssessmentTool() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<ReturnType<typeof computeAssessment> | null>(null);

  const question = ASSESSMENT_QUESTIONS[step];
  const isLast = step === ASSESSMENT_QUESTIONS.length - 1;

  function selectAnswer(value: string) {
    const next = { ...answers, [question.id]: value };
    setAnswers(next);

    if (isLast) {
      setResult(computeAssessment(next));
    } else {
      setStep((s) => s + 1);
    }
  }

  function reset() {
    setStep(0);
    setAnswers({});
    setResult(null);
  }

  if (result) {
    const params = new URLSearchParams(result.directoryParams);
    const directoryHref = `/directory?${params.toString()}`;

    return (
      <Card className="border-trust/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardCheck className="h-5 w-5 text-trust" />
            Your coverage suggestions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground leading-relaxed">{result.summary}</p>

          <div className="flex flex-wrap gap-2">
            {result.insuranceTypes.map((t) => {
              const label = INSURANCE_TYPES.find((it) => it.value === t)?.label ?? t;
              return (
                <span
                  key={t}
                  className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary"
                >
                  {label}
                </span>
              );
            })}
          </div>

          {result.specialties.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Suggested agent specialties: {result.specialties.join(', ')}
            </p>
          )}

          <div className="flex flex-wrap gap-3 pt-2">
            <Button asChild className="gap-2 min-h-[44px]">
              <Link href={directoryHref}>
                Browse matching agencies <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" onClick={reset}>
              Start over
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-lg">Insurance needs assessment</CardTitle>
          <span className="text-xs text-muted-foreground">
            {step + 1} of {ASSESSMENT_QUESTIONS.length}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-muted overflow-hidden mt-2">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${((step + 1) / ASSESSMENT_QUESTIONS.length) * 100}%` }}
          />
        </div>
      </CardHeader>
      <CardContent>
        <p className="font-medium text-foreground mb-4">{question.question}</p>
        <div className="grid gap-2">
          {question.options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => selectAnswer(opt.value)}
              className={cn(
                'text-left rounded-lg border px-4 py-3 text-sm transition-colors hover:bg-muted/60 hover:border-primary/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                answers[question.id] === opt.value && 'border-primary bg-primary/5'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {step > 0 && (
          <Button variant="ghost" className="mt-4" onClick={() => setStep((s) => s - 1)}>
            Back
          </Button>
        )}
      </CardContent>
    </Card>
  );
}