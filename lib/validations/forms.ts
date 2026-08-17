import { z } from 'zod';
import { INSURANCE_TYPES } from '@/lib/constants';

const insuranceTypeValues = INSURANCE_TYPES.map((t) => t.value) as [string, ...string[]];

export const contactFormSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().email('Please enter a valid email').max(254),
  subject: z.enum([
    'general',
    'data-correction',
    'listing',
    'partnership',
    'press',
  ]),
  message: z.string().min(20, 'Message must be at least 20 characters').max(5000),
  website: z.string().max(0).optional(),
});

export type ContactFormValues = z.infer<typeof contactFormSchema>;

export const CONTACT_SUBJECT_LABELS: Record<ContactFormValues['subject'], string> = {
  general: 'General inquiry',
  'data-correction': 'Data correction',
  listing: 'Add or update a listing (prefer /claim-listing)',
  partnership: 'Partnership opportunity',
  press: 'Press / media',
};

export const leadFormSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().max(254),
  phone: z
    .string()
    .regex(/^[\d\s()+-]{10,20}$/, 'Please enter a valid phone number')
    .optional()
    .or(z.literal('')),
  state: z.string().length(2, 'Select a state'),
  insuranceType: z.enum(insuranceTypeValues),
  message: z.string().max(2000).optional(),
  providerSlug: z.string().max(120).optional(),
  consent: z.boolean().refine((val) => val === true, {
    message: 'You must agree to be contacted',
  }),
  website: z.string().max(0).optional(),
});

export type LeadFormValues = z.infer<typeof leadFormSchema>;

export const reviewFormSchema = z.object({
  providerSlug: z.string().min(1).max(120),
  author: z.string().min(2).max(60),
  email: z.string().email().max(254),
  rating: z.number().min(1).max(5),
  title: z.string().min(5).max(120),
  content: z.string().min(50, 'Review must be at least 50 characters').max(3000),
  verifiedCustomer: z.boolean().optional(),
  website: z.string().max(0).optional(),
});

export type ReviewFormValues = z.infer<typeof reviewFormSchema>;

export const listingRequestSchema = z.object({
  submitterName: z.string().min(2, 'Name must be at least 2 characters').max(80),
  legalName: z.string().min(2, 'Legal business name is required').max(160),
  dbaName: z.string().max(160).optional().or(z.literal('')),
  licenseState: z.string().length(2, 'Select the state on the license'),
  licenseNumber: z.string().min(3, 'License number is required').max(40),
  npn: z.string().max(20).optional().or(z.literal('')),
  street: z.string().min(3, 'Street address is required').max(160),
  city: z.string().min(2, 'City is required').max(80),
  addressState: z.string().length(2, 'Select a state'),
  zip: z.string().regex(/^\d{5}(-\d{4})?$/, 'Enter a 5-digit ZIP'),
  phone: z.string().regex(/^[\d\s()+-]{10,20}$/, 'Enter a valid phone number'),
  workEmail: z.string().email('Enter a valid work email').max(254),
  agencyWebsite: z
    .string()
    .max(200)
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || /^https?:\/\//i.test(v) || /^[\w.-]+\.[a-z]{2,}/i.test(v), {
      message: 'Enter a full website or leave blank',
    }),
  linesOfAuthority: z.array(z.string()).optional(),
  authorized: z.boolean().refine((val) => val === true, {
    message: 'Confirm you are authorized to request this listing',
  }),
  notes: z.string().max(2000).optional().or(z.literal('')),
  website: z.string().max(0).optional(),
});

export type ListingRequestValues = z.infer<typeof listingRequestSchema>;