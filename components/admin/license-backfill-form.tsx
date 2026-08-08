'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { applyLicenseBackfillAction } from '@/lib/actions/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

type Props = {
  providerId: string;
  defaultState: string;
  defaultLicense?: string;
};

export function LicenseBackfillForm({
  providerId,
  defaultState,
  defaultLicense = '',
}: Props) {
  const [licenseNumber, setLicenseNumber] = useState(defaultLicense);
  const [licenseState, setLicenseState] = useState(defaultState.slice(0, 2).toUpperCase());
  const [source, setSource] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [checkedAt, setCheckedAt] = useState(new Date().toISOString());
  const [method, setMethod] = useState<'manual' | 'automated'>('manual');
  const [notes, setNotes] = useState('');
  const [identityMatchAccepted, setIdentityMatchAccepted] = useState(false);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(intent: 'promote_indexable' | 'save_pending' | 'keep_suppressed') {
    setPending(true);
    setMessage(null);
    setError(null);
    const res = await applyLicenseBackfillAction({
      providerId,
      licenseNumber,
      licenseState,
      source,
      sourceUrl: sourceUrl || undefined,
      checkedAt,
      method,
      notes: notes || undefined,
      identityMatchAccepted,
      intent,
    });
    setPending(false);
    if (!res.success) {
      setError(res.error ?? 'Save failed');
      return;
    }
    setMessage(res.message ?? 'Saved');
  }

  return (
    <div className="space-y-3 border-t pt-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">License number *</Label>
          <Input
            className="mt-1"
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
            placeholder="Real number from official lookup"
          />
        </div>
        <div>
          <Label className="text-xs">License state *</Label>
          <Input
            className="mt-1"
            value={licenseState}
            maxLength={2}
            onChange={(e) => setLicenseState(e.target.value.toUpperCase())}
          />
        </div>
        <div>
          <Label className="text-xs">Source (regulator) *</Label>
          <Input
            className="mt-1"
            value={source}
            onChange={(e) => setSource(e.target.value)}
            placeholder="FL DFS Licensee Search"
          />
        </div>
        <div>
          <Label className="text-xs">Source URL</Label>
          <Input
            className="mt-1"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://..."
          />
        </div>
        <div>
          <Label className="text-xs">Checked at (ISO) *</Label>
          <Input
            className="mt-1"
            value={checkedAt}
            onChange={(e) => setCheckedAt(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-xs">Method</Label>
          <Select
            className="mt-1"
            value={method}
            onChange={(e) => setMethod(e.target.value as 'manual' | 'automated')}
          >
            <option value="manual">manual</option>
            <option value="automated">automated</option>
          </Select>
        </div>
      </div>
      <div>
        <Label className="text-xs">Operator notes</Label>
        <Textarea
          className="mt-1"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Match notes, ambiguity, or rejection reason"
        />
      </div>
      <div className="flex items-center gap-2">
        <Checkbox
          id={`match-${providerId}`}
          checked={identityMatchAccepted}
          onCheckedChange={(c) => setIdentityMatchAccepted(c === true)}
        />
        <Label htmlFor={`match-${providerId}`} className="text-xs font-normal cursor-pointer">
          Identity match accepted (legal/DBA name + state align)
        </Label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => submit('promote_indexable')}
        >
          {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Promote indexable
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => submit('save_pending')}
        >
          Save pending
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={() => submit('keep_suppressed')}
        >
          Keep suppressed
        </Button>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {message && <p className="text-xs text-emerald-700">{message}</p>}
    </div>
  );
}
