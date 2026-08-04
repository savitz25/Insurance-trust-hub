'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface HubMatchFormProps {
  hubName: string;
}

/**
 * Optional research contact — not a quote marketplace or paid lead product.
 */
export function HubMatchForm({ hubName }: HubMatchFormProps) {
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="rounded-xl border border-trust/30 bg-trust/5 p-5 text-sm text-foreground">
        <p className="font-semibold text-trust">Request received</p>
        <p className="mt-1 text-muted-foreground">
          We&apos;ll share educational next steps and listed agencies serving {hubName}. Research
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
      <h3 className="font-semibold text-foreground">Request research help for {hubName}</h3>
      <p className="text-xs text-muted-foreground">
        Independent directory contact. No paid placements. Not a policy marketplace.
      </p>
      <div>
        <Label htmlFor="match-zip" className="text-xs">
          ZIP Code
        </Label>
        <Input id="match-zip" placeholder="12345" maxLength={5} required className="mt-1" />
      </div>
      <div>
        <Label htmlFor="match-email" className="text-xs">
          Email
        </Label>
        <Input
          id="match-email"
          type="email"
          placeholder="you@email.com"
          required
          className="mt-1"
        />
      </div>
      <Button type="submit" variant="trust" className="w-full">
        Send research request
      </Button>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        By submitting, you agree we may follow up with research links for listed agencies in this
        market. Not insurance advice. Verify all licenses independently.
      </p>
    </form>
  );
}
