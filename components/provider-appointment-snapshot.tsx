import { ExternalLink, Building2, Info } from 'lucide-react';
import type {
  AppointmentTypeGroup,
  ProviderAppointmentSnapshot,
} from '@/lib/dfs/appointments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

type Props = {
  snapshot: ProviderAppointmentSnapshot;
};

const TYPE_GROUP_LABEL: Record<AppointmentTypeGroup, string> = {
  agent: 'Agent / agency',
  mga: 'Managing general agent',
  broker: 'Broker',
  other: 'Other',
};

/**
 * Phase 6A/6B/7 — regulatory appointment snapshot on agency profiles.
 * Only render when snapshot exists with totalCount > 0.
 * Never ranks by appointment count; never implies preferred carriers.
 */
export function ProviderAppointmentSnapshotSection({ snapshot }: Props) {
  if (!snapshot?.totalCount || !snapshot.carriers?.length) return null;

  const asOfLabel = (() => {
    try {
      return new Date(snapshot.asOf).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return snapshot.asOf;
    }
  })();

  const shown = snapshot.carriers.length;
  const total = snapshot.totalCount;
  const capped = Boolean(snapshot.displayCapped) || shown < total;

  const groups = new Map<AppointmentTypeGroup, number>();
  for (const c of snapshot.carriers) {
    const g = c.typeGroup ?? 'other';
    groups.set(g, (groups.get(g) ?? 0) + 1);
  }
  const groupEntries = [...groups.entries()]
    .filter(([, n]) => n > 0)
    .sort((a, b) => a[0].localeCompare(b[0]));

  return (
    <section aria-labelledby="appointment-snapshot-heading">
      <h2 id="appointment-snapshot-heading" className="text-xl font-semibold mb-1">
        Carrier appointments — regulatory snapshot
      </h2>
      <p className="text-sm text-muted-foreground mb-4 leading-relaxed max-w-2xl">
        Appointing entities reported on Florida DFS appointment data for this license. This is a{' '}
        <span className="font-medium text-foreground">regulatory research snapshot</span>, not an
        endorsement, preferred-carrier list, or ranking.
      </p>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 font-medium">
            <Building2 className="h-4 w-4 text-primary shrink-0" aria-hidden />
            <span>
              {total.toLocaleString()} appointing{' '}
              {total === 1 ? 'entity' : 'entities'} on file
            </span>
          </CardTitle>
          {capped ? (
            <p className="text-sm font-medium text-foreground pt-1">
              Showing {shown.toLocaleString()} of {total.toLocaleString()} (alphabetical sample)
            </p>
          ) : (
            <p className="text-sm text-muted-foreground pt-1">
              Showing all {shown.toLocaleString()} listed on this snapshot
            </p>
          )}
          <p className="text-xs text-muted-foreground pt-1">
            Source: {snapshot.source} · Snapshot as of {asOfLabel}
            {typeof snapshot.activeCount === 'number'
              ? ` · ${snapshot.activeCount.toLocaleString()} active-status rows used`
              : null}
          </p>
          {groupEntries.length > 0 ? (
            <div className="flex flex-wrap gap-1.5 pt-2">
              <span className="text-xs text-muted-foreground self-center mr-1">
                Type mix (neutral):
              </span>
              {groupEntries.map(([g, n]) => (
                <Badge key={g} variant="outline" className="font-normal text-[11px]">
                  {TYPE_GROUP_LABEL[g]} · {n}
                </Badge>
              ))}
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="flex flex-wrap gap-1.5">
            {snapshot.carriers.map((c) => (
              <li key={`${c.name}|${c.type ?? ''}`}>
                <Badge variant="secondary" className="font-normal text-xs">
                  {c.name}
                  {c.type ? (
                    <span className="ml-1 opacity-70">· {c.type}</span>
                  ) : null}
                </Badge>
              </li>
            ))}
          </ul>

          <div className="flex gap-2 rounded-lg border border-border/80 bg-muted/30 p-3 text-xs text-muted-foreground leading-relaxed">
            <Info className="h-4 w-4 shrink-0 text-primary mt-0.5" aria-hidden />
            <ul className="space-y-1 list-disc pl-4">
              {snapshot.honesty.map((line) => (
                <li key={line}>{line}</li>
              ))}
              <li>
                Appointment counts do not rank agencies and do not imply better service or
                preferred carrier status.
              </li>
            </ul>
          </div>

          <a
            href={snapshot.lookupUrl || snapshot.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            Re-check appointments on Florida DFS
            <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          </a>
        </CardContent>
      </Card>
    </section>
  );
}
