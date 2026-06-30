'use client';

import { useState } from 'react';
import { ExternalLink, ShieldCheck, Search } from 'lucide-react';
import { getStateLicenseDepartments, getLicenseDepartment } from '@/lib/tools/license-verification';
import { US_STATES } from '@/lib/constants';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export function LicenseVerificationTool() {
  const [state, setState] = useState('FL');
  const [agentName, setAgentName] = useState('');

  const dept = getLicenseDepartment(state);
  const allDepts = getStateLicenseDepartments();

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-trust" />
            Verify an agent license
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Insurance agents and agencies must be licensed in each state where they sell policies.
            Use your state insurance department&apos;s official lookup to confirm active status before
            you buy coverage.
          </p>

          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="lic-state">State</Label>
              <Select
                id="lic-state"
                className="mt-1.5"
                value={state}
                onChange={(e) => setState(e.target.value)}
              >
                {US_STATES.map((s) => (
                  <option key={s.code} value={s.code}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="lic-name">Agent or agency name (optional)</Label>
              <Input
                id="lic-name"
                className="mt-1.5"
                placeholder="e.g. Summit Insurance Group"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
              />
            </div>
          </div>

          {dept && (
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <p className="font-medium">{dept.department}</p>
              {dept.notes && (
                <p className="text-sm text-muted-foreground">{dept.notes}</p>
              )}
              <Button asChild className="gap-2 min-h-[44px]">
                <a href={dept.lookupUrl} target="_blank" rel="noopener noreferrer">
                  Open {dept.name} license lookup
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Search className="h-4 w-4" />
            All state lookup links
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto pr-1">
            {allDepts.map((d) => (
              <a
                key={d.code}
                href={d.lookupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/50 transition-colors"
              >
                <span>
                  <span className="font-medium">{d.code}</span>
                  <span className="text-muted-foreground"> — {d.name}</span>
                </span>
                <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}