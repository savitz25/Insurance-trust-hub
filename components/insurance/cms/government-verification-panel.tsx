import { CheckCircle2, CircleDashed, Shield, MinusCircle, HelpCircle } from 'lucide-react';
import type { CmsParticipationStatus, GovernmentVerificationData } from '@/lib/insurance/cms/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

type RowStatus = 'verified' | 'pending' | 'missing' | 'na';

function participationRowStatus(status: CmsParticipationStatus): RowStatus {
  switch (status) {
    case 'active':
      return 'verified';
    case 'pending':
      return 'pending';
    case 'not_applicable':
      return 'na';
    case 'inactive':
    case 'not_found':
    default:
      return 'missing';
  }
}

function StatusIcon({ status }: { status: RowStatus }) {
  if (status === 'verified') {
    return <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />;
  }
  if (status === 'pending') {
    return <CircleDashed className="h-4 w-4 shrink-0 text-amber-600" aria-hidden />;
  }
  if (status === 'na') {
    return <MinusCircle className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />;
  }
  return <HelpCircle className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />;
}

function statusLabel(status: RowStatus): string {
  switch (status) {
    case 'verified':
      return 'Verified';
    case 'pending':
      return 'Pending verification';
    case 'na':
      return 'Not applicable';
    default:
      return 'Not available';
  }
}

function formatMonthYear(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

type Props = {
  data: GovernmentVerificationData;
  className?: string;
};

/**
 * Reusable Government / CMS verification panel for agent (and later carrier) profiles.
 * All values come from props — never invents NPI or enrollment claims.
 */
export function GovernmentVerificationPanel({ data, className }: Props) {
  const title = data.title ?? 'Government Verification';
  const participationStatus = participationRowStatus(data.cmsParticipation);
  const npiStatus: RowStatus = data.npi ? 'verified' : 'missing';
  const medicareStatus: RowStatus = data.medicareNotes
    ? participationStatus === 'na'
      ? 'na'
      : participationStatus
    : 'missing';
  const licenseStatus: RowStatus = data.licenseVerified ? 'verified' : 'pending';

  const rows: {
    key: string;
    label: string;
    value: string;
    status: RowStatus;
  }[] = [
    {
      key: 'cms',
      label: 'CMS participation / enrollment',
      value: data.cmsParticipationLabel ?? statusLabel(participationStatus),
      status: participationStatus,
    },
    {
      key: 'npi',
      label: 'NPI (National Provider Identifier)',
      value: data.npi ?? 'Not available — pending CMS match',
      status: npiStatus,
    },
    {
      key: 'medicare',
      label: 'Medicare-related credentials',
      value: data.medicareNotes ?? 'Not available',
      status: medicareStatus,
    },
    {
      key: 'license',
      label: 'State DOI listing cross-check',
      value: data.licenseVerified
        ? `Verified listing${data.licenseNumber ? ` · ${data.licenseNumber}` : ''}${
            data.licenseState ? ` (${data.licenseState})` : ''
          }`
        : 'Pending verification',
      status: licenseStatus,
    },
  ];

  return (
    <section
      aria-labelledby="government-verification-heading"
      className={cn(className)}
    >
      <Card className="overflow-hidden border-slate-200/90 shadow-sm ring-1 ring-slate-100">
        <CardHeader className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-teal-50/40 pb-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <CardTitle
              id="government-verification-heading"
              className="flex items-center gap-2 text-base font-semibold text-slate-900"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-white">
                <Shield className="h-4 w-4" aria-hidden />
              </span>
              {title}
            </CardTitle>
            <Badge
              variant="outline"
              className="border-teal-200 bg-white text-xs font-medium text-teal-800"
            >
              CMS Data Verified
            </Badge>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            Official government and licensing signals for transparency. Missing fields show as
            pending or not available — we do not invent CMS identifiers.
          </p>
        </CardHeader>
        <CardContent className="space-y-0 p-0">
          <ul className="divide-y divide-slate-100">
            {rows.map((row) => (
              <li
                key={row.key}
                className="flex gap-3 px-5 py-4 sm:items-start"
              >
                <StatusIcon status={row.status} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-medium text-slate-900">{row.label}</p>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                        row.status === 'verified' && 'bg-emerald-50 text-emerald-800',
                        row.status === 'pending' && 'bg-amber-50 text-amber-900',
                        (row.status === 'missing' || row.status === 'na') &&
                          'bg-slate-100 text-slate-600'
                      )}
                    >
                      {statusLabel(row.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{row.value}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="space-y-1 border-t border-slate-100 bg-slate-50/80 px-5 py-3">
            <p className="text-[11px] font-medium text-slate-700">
              Last Updated: {formatMonthYear(data.lastCmsUpdate)}
            </p>
            <p className="text-[11px] text-slate-500">
              Source: {data.dataSourceLabel}. CMS dataset refresh:{' '}
              {formatMonthYear(data.lastCmsUpdate)}. Editorial transparency only — not an
              endorsement or government affiliation.
            </p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
