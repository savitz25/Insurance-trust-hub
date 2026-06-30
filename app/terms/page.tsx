import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import { DISCLAIMER, SITE_EMAIL, SITE_NAME, SITE_URL } from '@/lib/constants';

export const metadata: Metadata = buildMetadata({
  title: 'Terms of Service',
  description: `Terms of service for using ${SITE_NAME} directory, tools, and resources.`,
  path: '/terms',
});

export default function TermsPage() {
  const effectiveDate = 'June 1, 2026';

  return (
    <div className="container mx-auto px-4 py-10 md:py-14 max-w-3xl">
      <h1 className="section-heading">Terms of Service</h1>
      <p className="mt-2 text-sm text-muted-foreground">Effective date: {effectiveDate}</p>

      <div className="mt-10 space-y-8 text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Agreement</h2>
          <p>
            By accessing {SITE_URL}, you agree to these Terms of Service. If you do not agree, do
            not use the site. {SITE_NAME} provides an informational directory and educational
            resources — we are not an insurance company, broker, or agent of record.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">No insurance advice</h2>
          <p>
            Content on this site is for general educational purposes only and does not constitute
            insurance, legal, or financial advice. Coverage decisions should be made with a licensed
            insurance professional after reviewing your specific circumstances.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Directory listings</h2>
          <p>{DISCLAIMER}</p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">User submissions</h2>
          <p>
            By submitting reviews, contact messages, or quote requests, you represent that your
            information is accurate and that you grant us a non-exclusive license to display and
            process your submission. We may remove content that violates these terms or applicable
            law.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Tools & estimates</h2>
          <p>
            Premium calculators and assessment tools provide estimates only. Actual premiums,
            coverage availability, and underwriting decisions are determined solely by licensed
            insurers and agents.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Prohibited use</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Scraping or automated harvesting of directory data without permission</li>
            <li>Submitting false reviews or fraudulent lead information</li>
            <li>Attempting to gain unauthorized access to admin or backend systems</li>
            <li>Using the site for unlawful purposes</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Disclaimer of warranties</h2>
          <p>
            THE SITE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. WE DO NOT
            GUARANTEE UNINTERRUPTED ACCESS, ACCURACY OF LISTINGS, OR OUTCOMES FROM AGENCY CONTACT.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Limitation of liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, {SITE_NAME.toUpperCase()} SHALL NOT BE LIABLE
            FOR INDIRECT, INCIDENTAL, OR CONSEQUENTIAL DAMAGES ARISING FROM USE OF THE SITE OR
            RELIANCE ON LISTED AGENCIES.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Governing law</h2>
          <p>
            These terms are governed by the laws of the State of Delaware, without regard to
            conflict-of-law principles, except where consumer protection laws in your state provide
            otherwise.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Contact</h2>
          <p>
            Questions about these Terms:{' '}
            <a href={`mailto:${SITE_EMAIL}`} className="text-primary hover:underline">
              {SITE_EMAIL}
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}