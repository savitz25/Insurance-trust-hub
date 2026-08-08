'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { runSecondaryEnrichmentAction } from '@/lib/actions/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';

type Props = {
  providerId: string;
  providerName: string;
};

export function EnrichmentForm({ providerId, providerName }: Props) {
  const [runGoogle, setRunGoogle] = useState(true);
  const [bbbUrl, setBbbUrl] = useState('');
  const [bbbRating, setBbbRating] = useState('');
  const [bbbAccredited, setBbbAccredited] = useState(false);
  const [bbbMatch, setBbbMatch] = useState(false);
  const [notes, setNotes] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onRun() {
    setPending(true);
    setMessage(null);
    setError(null);
    const res = await runSecondaryEnrichmentAction({
      providerId,
      runGoogle,
      bbbUrl: bbbUrl.trim() || undefined,
      bbbRating: bbbRating.trim() || undefined,
      bbbAccredited,
      bbbIdentityMatchAccepted: bbbMatch,
      operatorNotes: notes || undefined,
    });
    setPending(false);
    if (!res.success) {
      setError(res.error ?? 'Enrichment failed');
      return;
    }
    setMessage(res.message ?? 'Done');
  }

  return (
    <div className="space-y-3 border-t pt-3">
      <p className="text-xs text-muted-foreground">
        Enrich <strong>{providerName}</strong> only if already indexable_research. Google/BBB never
        grant license verified.
      </p>
      <div className="flex items-center gap-2">
        <Checkbox
          id={`g-${providerId}`}
          checked={runGoogle}
          onCheckedChange={(c) => setRunGoogle(c === true)}
        />
        <Label htmlFor={`g-${providerId}`} className="text-xs font-normal cursor-pointer">
          Fetch Google Places (requires GOOGLE_PLACES_API_KEY)
        </Label>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">BBB profile URL</Label>
          <Input
            className="mt-1"
            value={bbbUrl}
            onChange={(e) => setBbbUrl(e.target.value)}
            placeholder="https://www.bbb.org/..."
          />
        </div>
        <div>
          <Label className="text-xs">BBB rating</Label>
          <Input
            className="mt-1"
            value={bbbRating}
            onChange={(e) => setBbbRating(e.target.value)}
            placeholder="A+"
          />
        </div>
      </div>
      <div className="flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id={`ba-${providerId}`}
            checked={bbbAccredited}
            onCheckedChange={(c) => setBbbAccredited(c === true)}
          />
          <Label htmlFor={`ba-${providerId}`} className="text-xs font-normal cursor-pointer">
            BBB accredited
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id={`bm-${providerId}`}
            checked={bbbMatch}
            onCheckedChange={(c) => setBbbMatch(c === true)}
          />
          <Label htmlFor={`bm-${providerId}`} className="text-xs font-normal cursor-pointer">
            BBB identity match accepted
          </Label>
        </div>
      </div>
      <div>
        <Label className="text-xs">Operator notes</Label>
        <Textarea
          className="mt-1"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>
      <Button type="button" size="sm" disabled={pending} onClick={onRun}>
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
        Run enrichment
      </Button>
      {error && <p className="text-xs text-destructive">{error}</p>}
      {message && <p className="text-xs text-emerald-700 whitespace-pre-wrap">{message}</p>}
    </div>
  );
}
