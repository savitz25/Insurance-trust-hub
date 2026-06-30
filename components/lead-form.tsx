'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Loader2, Send } from 'lucide-react';
import { leadFormSchema, type LeadFormValues } from '@/lib/validations/forms';
import { INSURANCE_TYPES, US_STATES } from '@/lib/constants';
import { submitLead } from '@/lib/actions/leads';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card } from '@/components/ui/card';

interface LeadFormProps {
  providerSlug?: string;
  providerName?: string;
  defaultState?: string;
  defaultInsuranceType?: string;
}

export function LeadForm({
  providerSlug,
  providerName,
  defaultState = '',
  defaultInsuranceType = 'auto',
}: LeadFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<LeadFormValues>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      providerSlug,
      state: defaultState,
      insuranceType: defaultInsuranceType as LeadFormValues['insuranceType'],
      consent: false,
      website: '',
    },
  });

  const consent = watch('consent');

  async function onSubmit(data: LeadFormValues) {
    setServerError(null);
    const res = await submitLead(data);
    if (!res.success) {
      setServerError(res.error ?? 'Something went wrong.');
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <Card className="border-trust/30 bg-trust/5 p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-trust mx-auto mb-3" />
        <h2 className="text-xl font-semibold">Quote request sent</h2>
        <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          {providerName
            ? `Thank you. ${providerName} or a licensed agent in your area may contact you about coverage options.`
            : 'Thank you. A licensed agent may contact you about coverage options.'}
        </p>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {providerSlug && <input type="hidden" {...register('providerSlug')} />}

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="lead-name">
            Your name <span className="text-destructive">*</span>
          </Label>
          <Input id="lead-name" className="mt-1.5" {...register('name')} />
          {errors.name && (
            <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="lead-email">
            Email <span className="text-destructive">*</span>
          </Label>
          <Input id="lead-email" type="email" className="mt-1.5" {...register('email')} />
          {errors.email && (
            <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="lead-phone">Phone (optional)</Label>
          <Input id="lead-phone" className="mt-1.5" {...register('phone')} />
          {errors.phone && (
            <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="lead-state">
            State <span className="text-destructive">*</span>
          </Label>
          <Select id="lead-state" className="mt-1.5" {...register('state')}>
            <option value="">Select state</option>
            {US_STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </Select>
          {errors.state && (
            <p className="mt-1 text-xs text-destructive">{errors.state.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="lead-type">
          Insurance type <span className="text-destructive">*</span>
        </Label>
        <Select id="lead-type" className="mt-1.5" {...register('insuranceType')}>
          {INSURANCE_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
        {errors.insuranceType && (
          <p className="mt-1 text-xs text-destructive">{errors.insuranceType.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="lead-message">Message (optional)</Label>
        <Textarea
          id="lead-message"
          rows={4}
          className="mt-1.5"
          placeholder="Tell us about your coverage needs, move timeline, or questions."
          {...register('message')}
        />
      </div>

      <div className="flex items-start gap-2">
        <Checkbox
          id="lead-consent"
          checked={consent}
          onCheckedChange={(checked) => setValue('consent', checked === true, { shouldValidate: true })}
        />
        <Label htmlFor="lead-consent" className="text-sm font-normal cursor-pointer leading-relaxed">
          I agree to be contacted about insurance quotes. Insurance Trust Hub does not sell policies
          directly.{' '}
          <Link href="/privacy" className="underline underline-offset-2">
            Privacy Policy
          </Link>
        </Label>
      </div>
      {errors.consent && (
        <p className="text-xs text-destructive">{errors.consent.message}</p>
      )}

      <input type="hidden" {...register('website')} />

      {serverError && (
        <p className="text-sm text-destructive" role="alert">
          {serverError}
        </p>
      )}

      <Button type="submit" size="lg" className="gap-2 min-h-[48px] w-full sm:w-auto" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Sending…
          </>
        ) : (
          <>
            <Send className="h-4 w-4" /> Request free quote
          </>
        )}
      </Button>
    </form>
  );
}