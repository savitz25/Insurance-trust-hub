import { z } from 'zod';
import { INSURANCE_TYPES, SPECIALTIES } from '@/lib/constants';

const insuranceValues = INSURANCE_TYPES.map((t) => t.value);
const specialtyValues = [...SPECIALTIES];

export const adminProviderSchema = z.object({
  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase with hyphens'),
  name: z.string().min(2).max(120),
  providerType: z.enum(['independent_agent', 'brokerage', 'specialist']),
  city: z.string().min(2).max(80),
  state: z.string().length(2),
  zip: z.string().max(10).optional().or(z.literal('')),
  phone: z.string().max(30).optional().or(z.literal('')),
  website: z.string().url().optional().or(z.literal('')),
  licenseNumber: z.string().max(50).optional().or(z.literal('')),
  insuranceTypes: z.array(z.enum(insuranceValues as [string, ...string[]])).min(1),
  specialties: z.array(z.enum(specialtyValues as [string, ...string[]])),
  yearsInBusiness: z.coerce.number().min(0).max(150).optional().nullable(),
  relocationExperience: z.boolean(),
  verified: z.boolean(),
  shortDescription: z.string().max(300).optional().or(z.literal('')),
  description: z.string().max(10000).optional().or(z.literal('')),
});

export type AdminProviderFormValues = z.infer<typeof adminProviderSchema>;

export const adminLoginSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

export type AdminLoginValues = z.infer<typeof adminLoginSchema>;