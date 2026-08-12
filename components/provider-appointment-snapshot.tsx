import { ExternalLink, Building2 } from 'lucide-react';
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
 * Phase 6A/6B — regulatory appointment snapshot on agency profiles.
 * Only render when snapshot exists with totalCount > 0.
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

  const groups = new Map<AppointmentTypeGroup, number>();
  for (const c of snapshot.carriers) {
    const g = c.typeGroup ?? 'other';
    groups.set(g, (groups.get(g) ?? 0) + 1);
  }
  const groupSummary = [...groups.entries()]
    .filter(([, n]) => n > 0)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([g, n]) => `${TYPE_GROUP_LABEL[g]}: ${n}`)
    .join(' · ');

  return (
    <section aria-labelledby="appointment-snapshot-heading">
      <h2 id="appointment-snapshot-heading" className="text-xl font-semibold mb-4">
        Active appointments (regulatory snapshot)
      </h2>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2 font-medium">
            <Building2 className="h-4 w-4 text-primary" aria-hidden />
            {snapshot.totalCount.toLocaleString()} appointing{' '}
            {snapshot.totalCount === 1 ? 'entity' : 'entities'} on file
          </CardTitle>
          <p className="text-xs text-muted-foreground pt-1">
            Source: {snapshot.source} · Snapshot as of {asOfLabel}
            {typeof snapshot.activeCount === 'number'
              ? ` · ${snapshot.activeCount.toLocaleString()} active-status rows used`
              : null}
            {snapshot.displayCapped || snapshot.carriers.length < snapshot.totalCount
              ? ` · showing ${snapshot.carriers.length} alphabetically`
              : null}
          </p>
          {groupSummary ? (
            <p className="text-xs text-muted-foreground pt-0.5">
              Type mix (displayed, neutral labels): {groupSummary}
            </p>
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

          <ul className="space-y-1 text-xs text-muted-foreground leading-relaxed list-disc pl-4">
            {snapshot.honesty.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>

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
