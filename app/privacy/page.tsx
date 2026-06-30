import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo/metadata';
import { SITE_EMAIL, SITE_NAME, SITE_URL } from '@/lib/constants';

export const metadata: Metadata = buildMetadata({
  title: 'Privacy Policy',
  description: `Privacy policy for ${SITE_NAME} — how we collect, use, and protect your information.`,
  path: '/privacy',
});

export default function PrivacyPage() {
  const effectiveDate = 'June 1, 2026';

  return (
    <div className="container mx-auto px-4 py-10 md:py-14 max-w-3xl">
      <h1 className="section-heading">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted-foreground">Effective date: {effectiveDate}</p>

      <div className="mt-10 space-y-8 text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Overview</h2>
          <p>
            {SITE_NAME} (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates {SITE_URL} as
            an independent insurance agency directory. This Privacy Policy explains how we collect,
            use, disclose, and safeguard information when you visit our website or submit forms.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Information we collect</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>
              <strong className="text-foreground">Contact information:</strong> Name, email, phone
              number, and state when you submit contact, quote, or review forms.
            </li>
            <li>
              <strong className="text-foreground">Usage data:</strong> Pages visited, referral
              source, browser type, and approximate location derived from IP address via analytics
              services.
            </li>
            <li>
              <strong className="text-foreground">Cookies:</strong> Session cookies for admin
              authentication and analytics cookies where enabled.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">How we use information</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>Respond to inquiries and process quote referrals to listed agencies</li>
            <li>Moderate and publish user reviews</li>
            <li>Improve website content, search, and user experience</li>
            <li>Detect fraud, spam, and abuse</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Sharing with third parties</h2>
          <p>
            When you request a quote, we may share your contact details and coverage interests with
            the agency you selected or relevant licensed agents in your state. We do not sell
            personal information. We use service providers (hosting, analytics, database) bound by
            contractual confidentiality obligations.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Your choices</h2>
          <p>
            You may request access, correction, or deletion of personal information by emailing{' '}
            <a href={`mailto:${SITE_EMAIL}`} className="text-primary hover:underline">
              {SITE_EMAIL}
            </a>
            . California and other state privacy rights may apply — contact us for applicable
            requests.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Security</h2>
          <p>
            We implement reasonable administrative and technical safeguards. No internet transmission
            is fully secure; use our site at your own risk for highly sensitive data.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Children</h2>
          <p>
            Our services are not directed to individuals under 18. We do not knowingly collect data
            from children.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Changes</h2>
          <p>
            We may update this policy periodically. Material changes will be posted on this page
            with a revised effective date.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-foreground mb-3">Contact</h2>
          <p>
            Questions about this Privacy Policy:{' '}
            <a href={`mailto:${SITE_EMAIL}`} className="text-primary hover:underline">
              {SITE_EMAIL}
            </a>
          </p>
        </section>
      </div>
    </div>
  );
}