import Link from 'next/link';
import { format } from 'date-fns';
import {
  loadListingRequestsForAdmin,
  type ListingRequestDiagnostic,
} from '@/lib/admin/listing-requests';

function DiagnosticPanel({
  diagnostic,
  error,
}: {
  diagnostic: ListingRequestDiagnostic;
  error: string | null;
}) {
  const hostsDiffer =
    diagnostic.supabaseUrlHost &&
    diagnostic.nextPublicHost &&
    diagnostic.supabaseUrlHost !== diagnostic.nextPublicHost;

  return (
    <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
      <p className="font-medium">Admin diagnostic (no secrets)</p>
      {error ? <p className="mt-1">{error}</p> : null}
      {hostsDiffer ? (
        <p className="mt-1">
          SUPABASE_URL host and NEXT_PUBLIC_SUPABASE_URL host differ. This read uses SUPABASE_URL
          first.
        </p>
      ) : null}
      <dl className="mt-2 grid gap-1 font-mono text-xs sm:grid-cols-2">
        <div>hostUsed: {diagnostic.hostUsed ?? '—'}</div>
        <div>SUPABASE_URL: {diagnostic.supabaseUrlHost ?? 'unset'}</div>
        <div>NEXT_PUBLIC_SUPABASE_URL: {diagnostic.nextPublicHost ?? 'unset'}</div>
        <div>httpStatus: {diagnostic.httpStatus ?? '—'}</div>
        <div>contentRange: {diagnostic.contentRange ?? '—'}</div>
        <div>rowCount: {diagnostic.rowCount}</div>
        <div>jwtRole: {diagnostic.jwtRole ?? '—'}</div>
        <div>jwtRef: {diagnostic.jwtRef ?? '—'}</div>
        <div>serviceRoleConfigured: {diagnostic.serviceRoleConfigured ? 'yes' : 'no'}</div>
        <div>parseOk: {diagnostic.parseOk ? 'yes' : 'no'}</div>
        <div className="sm:col-span-2">path: {diagnostic.requestPath}</div>
        <div className="sm:col-span-2 whitespace-pre-wrap break-all">
          errorBody: {diagnostic.errorBody ?? '—'}
        </div>
      </dl>
    </div>
  );
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ALL_STATUSES = [
  'received',
  'needs_info',
  'verifying',
  'approved',
  'rejected',
  'withdrawn',
] as const;

export default async function AdminListingRequestsPage() {
  const { rows, error, openByEmail, diagnostic } = await loadListingRequestsForAdmin();
  const byStatus = Object.fromEntries(ALL_STATUSES.map((s) => [s, 0])) as Record<
    string,
    number
  >;
  for (const row of rows) {
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">Listing requests</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Agency claims loaded with the service role. Public profiles are created only after
        official license confirmation. This table is not publicly readable.
      </p>
      <p className="mt-2 text-xs text-muted-foreground">
        {ALL_STATUSES.map((s) => `${s} ${byStatus[s] ?? 0}`).join(' · ')}
        {rows.length ? ` · ${rows.length} total` : ''}
      </p>

      {error || rows.length === 0 ? (
        <DiagnosticPanel diagnostic={diagnostic} error={error} />
      ) : null}

      <div className="mt-8 overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-left">
              <th className="px-4 py-3 font-medium">Agency</th>
              <th className="px-4 py-3 font-medium">State / license</th>
              <th className="px-4 py-3 font-medium">Contact</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Source</th>
              <th className="px-4 py-3 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {!error && rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-muted-foreground">
                  No listing requests in the database.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const emailKey = (row.work_email || '').trim().toLowerCase();
                const openCount = openByEmail[emailKey] ?? 0;
                return (
                  <tr key={row.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={`/admin/listing-requests/${row.id}`}
                        className="text-primary underline-offset-2 hover:underline"
                      >
                        {row.legal_name}
                      </Link>
                      {row.submitter_name ? (
                        <div className="text-xs text-muted-foreground">{row.submitter_name}</div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.license_state} {row.license_number || '(none given)'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div>{row.work_email}</div>
                      {row.phone ? <div className="text-xs">{row.phone}</div> : null}
                      {openCount > 1 ? (
                        <div className="mt-1 text-xs text-amber-800">
                          {openCount} open requests for this email
                        </div>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">{row.status}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.source}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                      {format(new Date(row.created_at), 'MMM d, yyyy')}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
