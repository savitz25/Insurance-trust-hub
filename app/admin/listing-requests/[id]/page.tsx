import Link from 'next/link';
import { notFound } from 'next/navigation';
import { loadListingRequestByIdForAdmin } from '@/lib/admin/listing-requests';
import { ListingRequestOpsForm } from './listing-request-ops-form';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminListingRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { row, error } = await loadListingRequestByIdForAdmin(id);
  if (error) {
    return (
      <div className="max-w-3xl">
        <p className="text-sm text-destructive">Could not load request: {error}</p>
      </div>
    );
  }
  if (!row) notFound();

  return (
    <div className="max-w-3xl">
      <p className="text-sm">
        <Link href="/admin/listing-requests" className="text-primary underline-offset-2 hover:underline">
          Back to requests
        </Link>
      </p>
      <h1 className="mt-3 text-2xl font-bold tracking-tight">{row.legal_name}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Status: {row.status}
        {row.provider_id ? (
          <>
            {' '}
            · provider{' '}
            <Link href="/admin/providers" className="underline">
              linked
            </Link>
          </>
        ) : null}
      </p>

      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Submitter</dt>
          <dd>{row.submitter_name || '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Email</dt>
          <dd>{row.work_email}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Claimed license</dt>
          <dd>
            {row.license_state} {row.license_number || '(none)'}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">NPN</dt>
          <dd>{row.npn || '—'}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">Address</dt>
          <dd>
            {[row.street, row.city, row.address_state, row.zip].filter(Boolean).join(', ') || '—'}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Phone</dt>
          <dd>{row.phone || '—'}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Website</dt>
          <dd>{row.website || '—'}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">Notes</dt>
          <dd className="whitespace-pre-wrap">{row.notes || '—'}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">Ops notes</dt>
          <dd className="whitespace-pre-wrap">{row.ops_notes || '—'}</dd>
        </div>
      </dl>

      <div className="mt-8 rounded-xl border p-5">
        <h2 className="font-semibold">Ops</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Approve only after the official state lookup matches. BBB and Google reviews are not
          verification.
        </p>
        <div className="mt-4">
          <ListingRequestOpsForm
            id={row.id}
            defaultState={row.verified_license_state || row.license_state}
            defaultLicense={row.verified_license_number || row.license_number || ''}
            status={row.status}
          />
        </div>
      </div>
    </div>
  );
}
