'use server';

import { contactFormSchema, type ContactFormValues } from '@/lib/validations/forms';

export type ContactActionResult =
  | { success: true }
  | { success: false; error: string };

export async function submitContactForm(
  input: ContactFormValues
): Promise<ContactActionResult> {
  const parsed = contactFormSchema.safeParse(input);

  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Invalid form data',
    };
  }

  if (parsed.data.website) {
    return { success: true };
  }

  console.info('[submitContactForm] Message received', {
    name: parsed.data.name,
    email: parsed.data.email,
    subject: parsed.data.subject,
  });

  return { success: true };
}