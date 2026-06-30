'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import {
  adminProviderSchema,
  type AdminProviderFormValues,
} from '@/lib/validations/admin';
import { saveProviderAction } from '@/lib/actions/admin';
import { INSURANCE_TYPES, SPECIALTIES, US_STATES } from '@/lib/constants';
import type { AdminProviderFormData } from '@/lib/admin/provider-mapper';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface ProviderFormProps {
  providerId?: string;
  defaultValues?: Partial<AdminProviderFormData>;
}

export function ProviderForm({ providerId, defaultValues }: ProviderFormProps) {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AdminProviderFormValues>({
    resolver: zodResolver(adminProviderSchema),
    defaultValues: {
      providerType: 'independent_agent',
      insuranceTypes: ['auto', 'homeowners'],
      specialties: [],
      relocationExperience: false,
      verified: false,
      ...defaultValues,
    },
  });

  const insuranceTypes = watch('insuranceTypes') ?? [];
  const specialties = watch('specialties') ?? [];

  function toggleArrayItem(
    field: 'insuranceTypes' | 'specialties',
    value: string,
    current: string[]
  ) {
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    setValue(field, next as AdminProviderFormValues[typeof field], { shouldValidate: true });
  }

  async function onSubmit(data: AdminProviderFormValues) {
    setServerError(null);
    const res = await saveProviderAction(data, providerId);
    if (!res.success) {
      setServerError(res.error ?? 'Unable to save');
      return;
    }
    router.push('/admin/providers');
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Agency name *</Label>
          <Input id="name" className="mt-1.5" {...register('name')} />
          {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
        </div>
        <div>
          <Label htmlFor="slug">Slug *</Label>
          <Input id="slug" className="mt-1.5" {...register('slug')} />
          {errors.slug && <p className="mt-1 text-xs text-destructive">{errors.slug.message}</p>}
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="city">City *</Label>
          <Input id="city" className="mt-1.5" {...register('city')} />
          {errors.city && <p className="mt-1 text-xs text-destructive">{errors.city.message}</p>}
        </div>
        <div>
          <Label htmlFor="state">State *</Label>
          <Select id="state" className="mt-1.5" {...register('state')}>
            <option value="">Select</option>
            {US_STATES.map((s) => (
              <option key={s.code} value={s.code}>{s.name}</option>
            ))}
          </Select>
          {errors.state && <p className="mt-1 text-xs text-destructive">{errors.state.message}</p>}
        </div>
        <div>
          <Label htmlFor="zip">ZIP</Label>
          <Input id="zip" className="mt-1.5" {...register('zip')} />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" className="mt-1.5" {...register('phone')} />
        </div>
        <div>
          <Label htmlFor="website">Website</Label>
          <Input id="website" className="mt-1.5" {...register('website')} />
          {errors.website && <p className="mt-1 text-xs text-destructive">{errors.website.message}</p>}
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="licenseNumber">License number</Label>
          <Input id="licenseNumber" className="mt-1.5" {...register('licenseNumber')} />
        </div>
        <div>
          <Label htmlFor="providerType">Provider type</Label>
          <Select id="providerType" className="mt-1.5" {...register('providerType')}>
            <option value="independent_agent">Independent agent</option>
            <option value="brokerage">Brokerage</option>
            <option value="specialist">Specialist</option>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="yearsInBusiness">Years in business</Label>
        <Input id="yearsInBusiness" type="number" className="mt-1.5 w-32" {...register('yearsInBusiness')} />
      </div>

      <div>
        <Label className="mb-2 block">Insurance types *</Label>
        <div className="flex flex-wrap gap-2">
          {INSURANCE_TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => toggleArrayItem('insuranceTypes', t.value, insuranceTypes)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                insuranceTypes.includes(t.value)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'hover:bg-muted'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {errors.insuranceTypes && (
          <p className="mt-1 text-xs text-destructive">{errors.insuranceTypes.message}</p>
        )}
      </div>

      <div>
        <Label className="mb-2 block">Specialties</Label>
        <div className="flex flex-wrap gap-2">
          {SPECIALTIES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleArrayItem('specialties', s, specialties)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                specialties.includes(s)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'hover:bg-muted'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="shortDescription">Short description</Label>
        <Textarea id="shortDescription" rows={2} className="mt-1.5" {...register('shortDescription')} />
      </div>

      <div>
        <Label htmlFor="description">Full description</Label>
        <Textarea id="description" rows={6} className="mt-1.5" {...register('description')} />
      </div>

      <div className="flex flex-wrap gap-6">
        <div className="flex items-center gap-2">
          <Checkbox
            id="verified"
            checked={watch('verified')}
            onCheckedChange={(c) => setValue('verified', c === true)}
          />
          <Label htmlFor="verified" className="font-normal cursor-pointer">Verified listing</Label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="relocationExperience"
            checked={watch('relocationExperience')}
            onCheckedChange={(c) => setValue('relocationExperience', c === true)}
          />
          <Label htmlFor="relocationExperience" className="font-normal cursor-pointer">
            Relocation experience
          </Label>
        </div>
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting} className="gap-2 min-h-[44px]">
          {isSubmitting ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Save provider'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  );
}