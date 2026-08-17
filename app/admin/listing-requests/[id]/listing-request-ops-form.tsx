'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  approveListingRequestAction,
  updateListingRequestStatusAction,
} from '@/lib/actions/admin';

export function ListingRequestOpsForm(props: {
  id: string;
  defaultState: string;
  defaultLicense: string;
  status: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function setStatus(status: 'needs_info' | 'verifying' | 'rejected' | 'withdrawn') {
    setBusy(true);
    setError(null);
    const form = document.getElementById('ops-form') as HTMLFormElement;
    const fd = new FormData(form);
    const res = await updateListingRequestStatusAction({
      id: props.id,
      status,
      opsNotes: String(fd.get('opsNotes') || ''),
      rejectionReason: String(fd.get('rejectionReason') || ''),
    });
    setBusy(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  async function approve() {
    setBusy(true);
    setError(null);
    const form = document.getElementById('ops-form') as HTMLFormElement;
    const fd = new FormData(form);
    const res = await approveListingRequestAction({
      id: props.id,
      verifiedLicenseNumber: String(fd.get('verifiedLicenseNumber') || ''),
      verifiedLicenseState: String(fd.get('verifiedLicenseState') || ''),
      identityMatchAccepted: fd.get('identityMatchAccepted') === 'on',
      opsNotes: String(fd.get('opsNotes') || ''),
    });
    setBusy(false);
    if (!res.success) {
      setError(res.error);
      return;
    }
    router.refresh();
  }

  const locked = props.status === 'approved';

  return (
    <form id="ops-form" className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="verifiedLicenseState">Confirmed license state</Label>
          <Input
            id="verifiedLicenseState"
            name="verifiedLicenseState"
            defaultValue={props.defaultState}
            maxLength={2}
            disabled={locked}
            className="mt-1.5 uppercase"
          />
        </div>
        <div>
          <Label htmlFor="verifiedLicenseNumber">Confirmed license number</Label>
          <Input
            id="verifiedLicenseNumber"
            name="verifiedLicenseNumber"
            defaultValue={props.defaultLicense}
            disabled={locked}
            className="mt-1.5"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="opsNotes">Ops notes</Label>
        <Textarea id="opsNotes" name="opsNotes" rows={4} className="mt-1.5" disabled={locked} />
      </div>
      <div>
        <Label htmlFor="rejectionReason">Rejection / needs-info reason (shown internally)</Label>
        <Textarea id="rejectionReason" name="rejectionReason" rows={2} className="mt-1.5" disabled={locked} />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="identityMatchAccepted" disabled={locked} />
        Official record matches legal name, license number, active status, and address reasonably.
      </label>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {!locked ? (
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={busy} onClick={() => void approve()}>
            Approve (create verified listing)
          </Button>
          <Button type="button" variant="outline" disabled={busy} onClick={() => void setStatus('verifying')}>
            Mark verifying
          </Button>
          <Button type="button" variant="outline" disabled={busy} onClick={() => void setStatus('needs_info')}>
            Needs info
          </Button>
          <Button type="button" variant="outline" disabled={busy} onClick={() => void setStatus('rejected')}>
            Reject
          </Button>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Already approved. Do not re-promote from marketing claims.</p>
      )}
    </form>
  );
}
