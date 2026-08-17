import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';
import { buildMetadata } from '@/lib/seo/metadata';
import { ListingRequestForm } from '@/components/listing-request-form';
import { Card, CardContent } from '@/components/ui/card';
import { SITE_EMAIL } from '@/lib/constants';

export const metadata: Metadata = buildMetadata({
  title: 'Request an agency listing — Insurance Trust Hub',
  description:
    'Request a verified Insurance Trust Hub listing. We publish agencies only after we confirm an active state insurance license. Not paid placement.',
  path: '/claim-listing',
});

export default function ClaimListingPage() {
  return (
    <div className="container mx-auto px-4 py-10 md:py-14">
      <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-[1fr_320px]">
        <div>
          <h1 className="section-heading flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            Request a listing
          </h1>
          <p className="mt-3 max-w-xl leading-relaxed text-muted-foreground">
            We list agencies with verified state licenses, not paid placements.
            You provide the legal name, state, license number (and NPN if you
            have it), primary address, and a work email. We check official
            sources before any public profile goes live.
          </p>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Reviews, BBB ratings, and marketing claims are optional context. They
            never substitute for a license and never rank a listing.
          </p>
          <div className="mt-8">
            <ListingRequestForm />
          </div>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardContent className="pt-6 text-sm leading-relaxed text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">What we verify</p>
              <ul className="list-disc space-y-1 pl-4">
                <li>Legal name on the official record</li>
                <li>License number and active / valid status</li>
                <li>License state (one jurisdiction per listing)</li>
                <li>Address reasonableness</li>
              </ul>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="pt-6 text-sm leading-relaxed text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">What we do not do</p>
              <p>
                No paid placement. No &quot;get listed faster.&quot; No public
                profile from reviews or BBB alone. Other-state offices are
                metadata, not extra license badges.
              </p>
              <p className="mt-3">
                Already listed and need a correction?{' '}
                <Link href="/contact" className="text-primary underline-offset-2 hover:underline">
                  Contact us
                </Link>{' '}
                or email{' '}
                <a href={`mailto:${SITE_EMAIL}`} className="underline">
                  {SITE_EMAIL}
                </a>
                .
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}
