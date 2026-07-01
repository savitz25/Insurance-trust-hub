'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface HubMatchFormProps {
  hubName: string;
}

export function HubMatchForm({ hubName }: HubMatchFormProps) {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="rounded-xl border border-trust/30 bg-trust/5 p-5 text-sm text-foreground">
        <p className="font-semibold text-trust">Request received</p>
        <p className="mt-1 text-muted-foreground">
          We&apos;ll match you with up to 3 verified health insurance agents serving {hubName}. Research
          only — always verify licensing with your state DOI.
        </p>
      </div>
    );
  }

  return (
    <form
      className="rounded-xl border bg-card p-5 shadow-trust space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setSubmitted(true);
      }}
    >
      <h3 className="font-semibold text-foreground">Get Matched with 3 Free Quotes</h3>
      <p className="text-xs text-muted-foreground">
        Independent matching in {hubName}. No paid placements.
      </p>
      <div>
        <Label htmlFor="match-zip" className="text-xs">ZIP Code</Label>
        <Input id="match-zip" placeholder="12345" maxLength={5} required className="mt-1" />
      </div>
      <div>
        <Label htmlFor="match-email" className="text-xs">Email</Label>
        <Input id="match-email" type="email" placeholder="you@email.com" required className="mt-1" />
      </div>
      <Button type="submit" variant="trust" className="w-full">
        Match Me — Free
      </Button>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        By submitting, you agree we may share your inquiry with verified listed agents for research
        purposes. Not insurance advice. Verify all licenses independently.
      </p>
    </form>
  );
}