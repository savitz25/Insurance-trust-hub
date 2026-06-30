import type { Metadata } from 'next';
import { Mail, MessageSquare } from 'lucide-react';
import { buildMetadata } from '@/lib/seo/metadata';
import { SITE_EMAIL } from '@/lib/constants';
import { ContactForm } from '@/components/contact-form';
import { Card, CardContent } from '@/components/ui/card';

export const metadata: Metadata = buildMetadata({
  title: 'Contact Insurance Trust Hub',
  description:
    'Get in touch for general inquiries, data corrections, listing updates, partnerships, or press requests.',
  path: '/contact',
});

export default function ContactPage() {
  return (
    <div className="container mx-auto px-4 py-10 md:py-14">
      <div className="grid lg:grid-cols-[1fr_360px] gap-10 max-w-5xl mx-auto">
        <div>
          <h1 className="section-heading flex items-center gap-3">
            <MessageSquare className="h-8 w-8 text-primary" />
            Contact us
          </h1>
          <p className="mt-3 text-muted-foreground leading-relaxed max-w-xl">
            Questions about listings, data corrections, or partnerships? Send a message and we&apos;ll
            respond within 2–5 business days. For insurance quotes, use our{' '}
            <a href="/directory" className="text-primary hover:underline">agency directory</a>.
          </p>
          <div className="mt-8">
            <ContactForm />
          </div>
        </div>

        <aside className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Email</p>
                  <a
                    href={`mailto:${SITE_EMAIL}`}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {SITE_EMAIL}
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-muted/30">
            <CardContent className="pt-6 text-sm text-muted-foreground leading-relaxed">
              <p className="font-medium text-foreground mb-2">Data corrections</p>
              Include the agency name, state, and license number when reporting outdated
              information. We prioritize verified corrections from licensed entities.
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}