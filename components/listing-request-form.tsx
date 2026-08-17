'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import {
  listingRequestSchema,
  type ListingRequestValues,
} from '@/lib/validations/forms';
import { INSURANCE_TYPES, SITE_EMAIL, US_STATES } from '@/lib/constants';
import { submitListingRequest } from '@/lib/actions/listing-request';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';

export function ListingRequestForm() {
  const [submitted, setSubmitted] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ListingRequestValues>({
    resolver: zodResolver(listingRequestSchema),
    defaultValues: {
      licenseState: '',
      addressState: '',
      linesOfAuthority: [],
      authorized: false,
      website: '',
      agencyWebsite: '',
      dbaName: '',
      npn: '',
      notes: '',
    },
  });

  async function onSubmit(data: ListingRequestValues) {
    setServerError(null);
    const res = await submitListingRequest(data);
    if (!res.success) {
      setServerError('error' in res ? res.error : 'Something went wrong.');
      return;
    }
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <Card className="border-trust/30 bg-trust/5 p-8 text-center">
        <CheckCircle2 className="mx-auto mb-3 h-10 w-10 text-trust" />
        <h2 className="text-xl font-semibold">Request received</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-muted-foreground">
          We verify active state licenses before any public profile goes live.
          Typical review is 3-7 business days. Reviews and BBB ratings do not
          speed this up and are not a substitute for a license.
        </p>
      </Card>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="lr-submitter">
            Your name <span className="text-destructive">*</span>
          </Label>
          <Input id="lr-submitter" className="mt-1.5" {...register('submitterName')} />
          {errors.submitterName && (
            <p className="mt-1 text-xs text-destructive">{errors.submitterName.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="lr-email">
            Work email <span className="text-destructive">*</span>
          </Label>
          <Input id="lr-email" type="email" className="mt-1.5" {...register('workEmail')} />
          {errors.workEmail && (
            <p className="mt-1 text-xs text-destructive">{errors.workEmail.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="lr-legal">
            Legal agency / business name <span className="text-destructive">*</span>
          </Label>
          <Input id="lr-legal" className="mt-1.5" {...register('legalName')} />
          {errors.legalName && (
            <p className="mt-1 text-xs text-destructive">{errors.legalName.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="lr-dba">DBA (optional)</Label>
          <Input id="lr-dba" className="mt-1.5" {...register('dbaName')} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="lr-lic-state">
            State of license <span className="text-destructive">*</span>
          </Label>
          <Select id="lr-lic-state" className="mt-1.5" {...register('licenseState')}>
            <option value="">Select</option>
            {US_STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </Select>
          {errors.licenseState && (
            <p className="mt-1 text-xs text-destructive">{errors.licenseState.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="lr-lic">
            License number <span className="text-destructive">*</span>
          </Label>
          <Input id="lr-lic" className="mt-1.5" {...register('licenseNumber')} />
          {errors.licenseNumber && (
            <p className="mt-1 text-xs text-destructive">{errors.licenseNumber.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="lr-npn">NPN (encouraged)</Label>
          <Input id="lr-npn" className="mt-1.5" {...register('npn')} />
        </div>
      </div>

      <div>
        <Label htmlFor="lr-street">
          Primary street address <span className="text-destructive">*</span>
        </Label>
        <Input id="lr-street" className="mt-1.5" {...register('street')} />
        {errors.street && (
          <p className="mt-1 text-xs text-destructive">{errors.street.message}</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label htmlFor="lr-city">
            City <span className="text-destructive">*</span>
          </Label>
          <Input id="lr-city" className="mt-1.5" {...register('city')} />
          {errors.city && (
            <p className="mt-1 text-xs text-destructive">{errors.city.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="lr-addr-state">
            State <span className="text-destructive">*</span>
          </Label>
          <Select id="lr-addr-state" className="mt-1.5" {...register('addressState')}>
            <option value="">Select</option>
            {US_STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </Select>
          {errors.addressState && (
            <p className="mt-1 text-xs text-destructive">{errors.addressState.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="lr-zip">
            ZIP <span className="text-destructive">*</span>
          </Label>
          <Input id="lr-zip" className="mt-1.5" {...register('zip')} />
          {errors.zip && (
            <p className="mt-1 text-xs text-destructive">{errors.zip.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="lr-phone">
            Phone <span className="text-destructive">*</span>
          </Label>
          <Input id="lr-phone" className="mt-1.5" {...register('phone')} />
          {errors.phone && (
            <p className="mt-1 text-xs text-destructive">{errors.phone.message}</p>
          )}
        </div>
        <div>
          <Label htmlFor="lr-site">Website (optional)</Label>
          <Input
            id="lr-site"
            className="mt-1.5"
            placeholder="https://"
            {...register('agencyWebsite')}
          />
          {errors.agencyWebsite && (
            <p className="mt-1 text-xs text-destructive">{errors.agencyWebsite.message}</p>
          )}
        </div>
      </div>

      <fieldset>
        <legend className="text-sm font-medium">Lines / LOAs (optional)</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {INSURANCE_TYPES.map((t) => (
            <label key={t.value} className="flex items-center gap-2 text-sm">
              <input type="checkbox" value={t.value} {...register('linesOfAuthority')} />
              {t.label}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <Label htmlFor="lr-notes">Notes (optional)</Label>
        <Textarea
          id="lr-notes"
          rows={4}
          className="mt-1.5"
          placeholder="Second location, NPN for the firm vs a producer, or anything we should match on the official record."
          {...register('notes')}
        />
      </div>

      <label className="flex items-start gap-2 text-sm leading-relaxed">
        <input type="checkbox" className="mt-1" {...register('authorized')} />
        <span>
          I am authorized to request this listing for the agency named above.{' '}
          <span className="text-destructive">*</span>
        </span>
      </label>
      {errors.authorized && (
        <p className="text-xs text-destructive">{errors.authorized.message}</p>
      )}

      <input type="hidden" {...register('website')} />

      <p className="text-xs leading-relaxed text-muted-foreground">
        Submitting a request does not publish a profile and is not paid placement.
        See our{' '}
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

      <Button type="submit" size="lg" className="min-h-[48px] gap-2" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" /> Sending…
          </>
        ) : (
          <>
            <ShieldCheck className="h-4 w-4" /> Submit for license verification
          </>
        )}
      </Button>
    </form>
  );
}
