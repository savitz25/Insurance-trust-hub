import type { Metadata } from 'next';
import { BadgeCheck, Database, Scale, Shield } from 'lucide-react';
import { buildMetadata } from '@/lib/seo/metadata';
import { DISCLAIMER, SITE_NAME } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = buildMetadata({
  title: 'About Insurance Trust Hub — Independence & Verification',
  description:
    'Learn how Insurance Trust Hub researches agencies, verifies listings, and maintains editorial independence.',
  path: '/about',
});

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-10 md:py-14 max-w-3xl">
      <h1 className="section-heading">About {SITE_NAME}</h1>
      <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
        {SITE_NAME} is an independent informational directory. We help consumers research licensed
        insurance agencies, read moderated reviews, and request quotes — we do not sell insurance
        policies or receive commissions from listings displayed.
      </p>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          Independence statement
        </h2>
        <p className="mt-4 text-muted-foreground leading-relaxed">
          We are not affiliated with, endorsed by, or a partner of the insurance agencies, brokers,
          or carriers listed on this site. Company names, logos, and descriptive data are used for
          identification and research purposes only. Listing presence does not constitute a
          recommendation or guarantee of service quality.
        </p>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <BadgeCheck className="h-5 w-5 text-trust" />
          Verification methodology
        </h2>
        <div className="mt-6 grid gap-4">
          {[
            {
              step: '1',
              title: 'License cross-check',
              text: 'We attempt to match agency license numbers against state insurance department public records where available.',
            },
            {
              step: '2',
              title: 'Business identity review',
              text: 'Listings include publicly available contact information, carrier appointments, and years in business when disclosed.',
            },
            {
              step: '3',
              title: 'Review moderation',
              text: 'User-submitted reviews are screened for spam, profanity, and obvious conflicts of interest before publication.',
            },
            {
              step: '4',
              title: 'Ongoing corrections',
              text: 'Agencies and consumers can report outdated data via our contact form. Corrections are processed within 5–10 business days.',
            },
          ].map((item) => (
            <Card key={item.step}>
              <CardContent className="pt-5 flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                  {item.step}
                </span>
                <div>
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{item.text}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Database className="h-5 w-5 text-primary" />
          Data sources
        </h2>
        <ul className="mt-4 space-y-2 text-muted-foreground leading-relaxed list-disc pl-5">
          <li>State insurance department public license databases</li>
          <li>Agency-submitted profile information and voluntary updates</li>
          <li>Moderated consumer reviews submitted through our website</li>
          <li>Industry reference data for educational premium range estimates</li>
          <li>NAIC and state regulatory publications for destination guides</li>
        </ul>
      </section>

      <section id="disclaimer" className="mt-12 rounded-xl border bg-muted/30 p-6">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Disclaimer
        </h2>
        <p className="mt-3 text-sm text-muted-foreground leading-relaxed">{DISCLAIMER}</p>
      </section>
    </div>
  );
}