import Link from 'next/link';
import { ContextNav } from '@/components/context-nav';
import { DisclaimerBanner } from '@/components/disclaimer-banner';
import {
  ABSENCE_NOT_NEVER_EXAMINED,
  LEGAL_INSURER_NOT_BRAND,
  WHAT_THIS_DOES_NOT_MEAN,
  WHAT_THIS_MEANS,
  attachmentConsumerCopy,
  examTypeLabel,
  factualExamCopy,
  publishedExamCountCopy,
  type PublishedInsurer,
} from '@/lib/national/legal-insurer-pilot';
import type { LegalInsurerProfileV1 } from '@/lib/national/legal-insurer-profile';
import { insurerProfilePath } from '@/lib/national/legal-insurer-pilot';

export function LegalInsurerProfileView({
  row,
  profile,
}: {
  row: PublishedInsurer;
  profile: LegalInsurerProfileV1;
}) {
  const path = insurerProfilePath(row.slug);
  const reports = profile.examinationReports.filter((r) => r.publicSafe);
  const jurisdictions = row.jurisdiction.join(', ');

  return (
    <>
      <div className="border-b bg-muted/20">
        <div className="container mx-auto max-w-3xl px-4 py-8 md:py-10">
          <ContextNav pathname={path} currentLabel={row.canonical_legal_name} className="mb-4" />
          <p className="text-xs font-semibold uppercase tracking-wider text-[#0284C7]">Legal insurer</p>
          <h1 className="mt-2 text-3xl md:text-4xl font-bold tracking-tight text-[#0A2540] break-words">
            {row.canonical_legal_name}
          </h1>
          <p className="mt-2 text-lg md:text-xl text-[#0A2540]">NAIC Company Code: {row.naic_cocode}</p>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            Official research record for this exact legal insurer. {publishedExamCountCopy(reports.length)}
            {jurisdictions ? ` Published evidence currently includes ${jurisdictions}.` : ''}
          </p>
        </div>
      </div>

      <div className="container mx-auto max-w-3xl px-4 py-8 space-y-10">
        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-[#0A2540]">Legal identity</h2>
          <dl className="grid gap-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Legal company name</dt>
              <dd className="font-medium">{row.canonical_legal_name}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">NAIC company code</dt>
              <dd className="font-medium">{row.naic_cocode}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Entity type</dt>
              <dd className="font-medium">Legal insurer</dd>
            </div>
            {jurisdictions ? (
              <div>
                <dt className="text-muted-foreground">Jurisdiction represented by currently published evidence</dt>
                <dd className="font-medium">{jurisdictions}</dd>
              </div>
            ) : null}
          </dl>
          <p className="text-sm text-muted-foreground leading-relaxed">{LEGAL_INSURER_NOT_BRAND}</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-[#0A2540]">Examination Reports</h2>
          <p className="text-sm text-muted-foreground">{publishedExamCountCopy(reports.length)}</p>
          <ul className="space-y-3">
            {reports.map((exam, i) => (
              <li key={`${exam.examType}-${exam.reportDate}-${i}`} className="rounded-lg border bg-card p-4 space-y-2">
                <p className="font-semibold text-[#0A2540]">{examTypeLabel(exam.examType)}</p>
                <p className="text-sm">{exam.regulator}</p>
                {exam.reportDate ? <p className="text-sm text-muted-foreground">Report date: {exam.reportDate}</p> : null}
                <p className="text-sm leading-relaxed">{factualExamCopy(exam.examType)}</p>
                {exam.officialSource ? (
                  <p>
                    <a
                      href={exam.officialSource}
                      className="inline-flex min-h-11 items-center text-sm font-medium text-[#0284C7] underline underline-offset-2"
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      Open official examination report
                    </a>
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-[#0A2540]">What this evidence means</h2>
          <p className="text-sm leading-relaxed">{WHAT_THIS_MEANS}</p>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-[#0A2540]">What this evidence does not mean</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm leading-relaxed">
            {WHAT_THIS_DOES_NOT_MEAN.map((line) => (
              <li key={line}>{line}</li>
            ))}
            <li>{ABSENCE_NOT_NEVER_EXAMINED}</li>
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-[#0A2540]">Source coverage</h2>
          <ul className="list-disc pl-5 space-y-2 text-sm text-muted-foreground leading-relaxed">
            {profile.limitations.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-[#0A2540]">Trace This Record</h2>
          {reports.map((exam, i) => (
            <details key={`trace-${i}`} className="rounded-lg border p-3">
              <summary className="cursor-pointer min-h-11 font-medium text-sm">
                Trace {examTypeLabel(exam.examType)}
              </summary>
              <dl className="mt-3 grid gap-2 text-sm">
                <div>
                  <dt className="text-muted-foreground">Regulator</dt>
                  <dd>{exam.regulator}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Source family</dt>
                  <dd>{exam.examType}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">NAIC company code used for attachment</dt>
                  <dd>{row.naic_cocode}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">How this was matched</dt>
                  <dd>{attachmentConsumerCopy(exam.attachmentMethod)}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Report date</dt>
                  <dd>{exam.reportDate || 'Not stated as a single date in the published extract'}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Source retrieved</dt>
                  <dd>{profile.sourceClocks[i]?.retrievedAt}</dd>
                </div>
                {exam.officialSource ? (
                  <div>
                    <dt className="text-muted-foreground">Official document</dt>
                    <dd>
                      <a href={exam.officialSource} className="text-[#0284C7] underline break-all" rel="noopener noreferrer" target="_blank">
                        {exam.officialSource}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {exam.documentHash ? (
                  <div>
                    <dt className="text-muted-foreground">Document fingerprint</dt>
                    <dd className="break-all font-mono text-xs">{exam.documentHash}</dd>
                  </div>
                ) : null}
              </dl>
            </details>
          ))}
        </section>

        <section className="space-y-2">
          <h2 className="text-xl font-semibold text-[#0A2540]">Sources / methodology</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Identity is the NAIC legal-insurer spine. Examination records attach only when the official PDF names this
            company as an examination subject with a document-native CoCode. This page does not rank insurers.{' '}
            <Link href="/methodology" className="text-[#0284C7] underline">
              Hub-wide methodology
            </Link>
          </p>
        </section>
      </div>
      <DisclaimerBanner />
    </>
  );
}
