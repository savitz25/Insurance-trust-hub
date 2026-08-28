import type { InsuranceAgencyTrustReportV1 } from '@/lib/national/agency-trust-report';
import { TDI_COMPLAINT_COPY } from '@/lib/national/regulatory-display';
import { SAFE_PUBLIC_COPY } from '@/lib/national/regulatory-evidence';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Props = {
  report: InsuranceAgencyTrustReportV1;
};

/**
 * Canonical agency Trust Report on an existing public provider page.
 * Only mounted when a CONFIRMED provider→graph bridge exists.
 * Does not inherit legal-insurer complaint statistics.
 */
export function AgencyTrustReportSection({ report }: Props) {
  const credPreview = report.credentials.slice(0, 8);
  const loaPreview = report.loas.slice(0, 8);
  const contactPreview = report.contacts.slice(0, 8);

  return (
    <section aria-labelledby="agency-trust-report-heading" className="space-y-4">
      <div>
        <h2 id="agency-trust-report-heading" className="text-xl font-semibold">
          National research snapshot
        </h2>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed max-w-2xl">
          Canonical agency record from currently included official sources. Research
          dossier — not an endorsement, ranking, or Trust Score.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Identity / Verification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            <span className="font-medium">Canonical name:</span> {report.entity.legalName}
          </p>
          {report.entity.npn ? (
            <p>
              <span className="font-medium">NPN:</span> {report.entity.npn}
            </p>
          ) : null}
          <p className="text-muted-foreground">{report.footprintCopy}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">State credentials</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {credPreview.length === 0 ? (
            <p className="text-muted-foreground">
              No state credentials were found in the sources currently included in our
              research.
            </p>
          ) : (
            <ul className="space-y-2">
              {credPreview.map((c, i) => (
                <li key={`${c.jurisdiction}-${c.licenseNumber}-${i}`}>
                  <span className="font-medium">{c.jurisdiction}</span> license{' '}
                  {c.licenseNumber}
                  {c.licenseClass ? ` · ${c.licenseClass}` : ''}
                  {c.regulatoryStatus ? ` · ${c.regulatoryStatus}` : ''}
                  <span className="block text-xs text-muted-foreground">
                    Source: {c.sourceDataset}
                    {c.sourceObservedAt ? ` · as of ${c.sourceObservedAt.slice(0, 10)}` : ''}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {report.credentials.length > credPreview.length ? (
            <p className="text-xs text-muted-foreground">
              {report.credentials.length} state credentials in currently included sources.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Lines of authority</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {loaPreview.length === 0 ? (
            <p className="text-muted-foreground">
              No lines of authority were found in the sources currently included.
            </p>
          ) : (
            <ul className="space-y-1">
              {loaPreview.map((l, i) => (
                <li key={`${l.officialText}-${i}`}>
                  {l.officialText}
                  {l.officialCode ? ` (${l.officialCode})` : ''}
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Source-reported terminology. Not product expertise or quality.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Carrier appointments</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p className="text-muted-foreground leading-relaxed">
            {report.appointmentCoverageNote}
          </p>
        </CardContent>
      </Card>

      {report.cms.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">CMS Marketplace registration evidence</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {report.cms.map((c, i) => (
              <p key={`${c.evidenceType}-${c.planYear}-${i}`}>
                {c.evidenceType}
                {c.planYear ? ` · plan year ${c.planYear}` : ''}
                <span className="block text-xs text-muted-foreground">{c.note}</span>
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {contactPreview.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Business / contact information</CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {contactPreview.map((c, i) => (
              <p key={`${c.kind}-${i}`}>
                <span className="font-medium">{c.kind}:</span> {c.value}
                <span className="block text-xs text-muted-foreground">{c.sourceDataset}</span>
              </p>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">{SAFE_PUBLIC_COPY.heading}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          <p className="font-medium">{TDI_COMPLAINT_COPY.heading}</p>
          <p className="text-muted-foreground leading-relaxed">{report.regulatoryNote}</p>
          <p className="text-muted-foreground leading-relaxed">
            {SAFE_PUBLIC_COPY.noMatch.replace(
              '[date]',
              'the source date on each record'
            )}
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            {TDI_COMPLAINT_COPY.coverageNote} {TDI_COMPLAINT_COPY.notFinding}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Sources currently included in our research</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          {report.sources.length === 0 ? (
            <p className="text-muted-foreground">
              Source coverage varies by jurisdiction. Missing data is not evidence of
              absence.
            </p>
          ) : (
            <ul className="space-y-1">
              {report.sources.map((s, i) => (
                <li key={`${s.dataset}-${i}`}>
                  {s.authority} · {s.dataset}
                  {s.asOf ? ` · as of ${s.asOf.slice(0, 10)}` : ''}
                </li>
              ))}
            </ul>
          )}
          <ul className="text-xs text-muted-foreground space-y-1 pt-2 border-t border-border/60">
            {report.limitations.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </section>
  );
}
