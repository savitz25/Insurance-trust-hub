import type { Metadata } from 'next';
import Link from 'next/link';
import { listBackfillCandidates } from '@/lib/ops/license-backfill';
import { isSupabaseAdminConfigured } from '@/lib/supabase/config';
import { LicenseBackfillForm } from '@/components/admin/license-backfill-form';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const metadata: Metadata = {
  title: 'License backfill ops',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

export default async function LicenseBackfillPage() {
  const configured = isSupabaseAdminConfigured();
  let candidates: Awaited<ReturnType<typeof listBackfillCandidates>> = [];
  let loadError: string | null = null;

  if (configured) {
    try {
      candidates = await listBackfillCandidates(80);
    } catch (e) {
      loadError = e instanceof Error ? e.message : 'Failed to load queue';
    }
  }

  const pending = candidates.filter((c) => c.listingClass === 'pending_verification').length;
  const seedish = candidates.filter((c) => c.listingClass === 'seed').length;

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">License backfill ops</h1>
        <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
          Phase 6B1 — attach real license numbers from official DOI/DFS sources only. Do not invent
          numbers. Promote to indexable only when identity match + source + checkedAt are complete.
        </p>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Queue size</CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{candidates.length}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending verification
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{pending}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Suppressed / incomplete
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">{seedish}</CardContent>
        </Card>
      </div>

      {!configured && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Supabase admin is not configured in this environment. Use the offline checklist in{' '}
          <code className="text-xs">docs/INSURANCE-PHASE-6B1-LICENSE-BACKFILL.md</code> and the CLI
          batch format. No production rows can be written until admin credentials are set.
        </div>
      )}

      {loadError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Candidate queue (priority order)</h2>
        {candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No candidates loaded. Either all rows are already indexable, or Supabase is empty /
            offline.
          </p>
        ) : (
          <ul className="space-y-6">
            {candidates.map((c) => (
              <li key={c.id} className="rounded-xl border bg-card p-4 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div>
                    <p className="font-semibold">
                      <Link
                        href={`/admin/providers/${c.id}/edit`}
                        className="text-primary hover:underline"
                      >
                        {c.name}
                      </Link>
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {c.city}, {c.state} ·{' '}
                      <Link href={`/providers/${c.slug}`} className="underline">
                        public profile
                      </Link>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">{c.reason}</p>
                  </div>
                  <Badge variant="outline">{c.listingClass}</Badge>
                </div>
                <LicenseBackfillForm
                  providerId={c.id}
                  defaultState={c.state}
                  defaultLicense={c.licenseNumber ?? ''}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
