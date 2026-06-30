'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Loader2, Mail } from 'lucide-react';
import {
  contactFormSchema,
  CONTACT_SUBJECT_LABELS,
  type ContactFormValues,
} from '@/lib/validations/forms';
import { SITE_EMAIL } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { submitContactForm } from '@/lib/actions/contact';

export function ContactForm() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      subject: 'general',
      website: '',
    },
  });

  async function onSubmit(data: ContactFormValues) {
    setServerError(null);
    const res = await submitContactForm(data);
    if (!res.success) {
      setServerError('error' in res ? res.error : 'Something went wrong.');
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <Card className="border-trust/30 bg-trust/5 p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-trust mx-auto mb-3" />
        <h2 className="text-xl font-semibold">Message sent</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          Thank you for reaching out. We typically respond within 2–5 business days.
        </p>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="contact-name">
            Your name <span className="text-destructive">*</span>
          </Label>
          <Input id="contact-name" className="mt-1.5" {...register('name')} />
          {errors.name && (
            <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="contact-email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input
            id="contact-email"
            type="email"
            className="mt-1.5"
            {...register('email')}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="contact-subject">
          Topic <span className="text-destructive">*</span>
        </Label>
        <Select id="contact-subject" className="mt-1.5" {...register('subject')}>
          {Object.entries(CONTACT_SUBJECT_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
        {errors.subject && (
          <p className="mt-1 text-xs text-destructive">{errors.subject.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="contact-message">
          Message <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="contact-message"
          rows={6}
          className="mt-1.5"
          placeholder="How can we help? For data corrections, include the agency name and state license number."
          {...register('message')}
        />
        {errors.message && (
          <p className="mt-1 text-xs text-destructive">{errors.message.message}</p>
        )}
      </div>

      <input type="hidden" {...register('website')} />

      <p className="text-xs text-muted-foreground leading-relaxed">
        By submitting, you agree to our{' '}
        <Link href="/privacy" className="underline underline-offset-2">
          Privacy Policy
        </Link>
        .
      </p>

      {serverError && (
        <p className="text-sm text-destructive" role="alert">
          {serverError}{' '}
          <a href={`mailto:${SITE_EMAIL}`} className="underline">
            {SITE_EMAIL}
          </a>
        </p>
      )}

      <Button type="submit" size="lg" className="gap-2 min-h-[48px]" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Sending…
          </>
        ) : (
          <>
            <Mail className="h-4 w-4" /> Send message
          </>
        )}
      </Button>
    </form>
  );
}