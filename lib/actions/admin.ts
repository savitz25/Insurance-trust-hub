'use server';

import { adminLoginSchema, adminProviderSchema } from '@/lib/validations/admin';
import {
  createProvider,
  deleteProvider,
  moderateReview,
  updateProvider,
} from '@/lib/admin/mutations';
import { schemaToFormData } from '@/lib/admin/provider-mapper';
import type { ReviewStatus } from '@/types/supabase';

export type AdminActionResult =
  | { success: true; id?: string; slug?: string }
  | { success: false; error: string };

export async function saveProviderAction(
  input: unknown,
  id?: string
): Promise<AdminActionResult> {
  const parsed = adminProviderSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid data' };
  }

  try {
    const data = schemaToFormData(parsed.data);

    if (id) {
      const row = await updateProvider(id, data);
      return { success: true, id: row.id, slug: row.slug };
    }

    const row = await createProvider(data);
    return { success: true, id: row.id, slug: row.slug };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unable to save provider',
    };
  }
}

export async function deleteProviderAction(id: string): Promise<AdminActionResult> {
  if (!id) return { success: false, error: 'Provider ID required' };

  try {
    await deleteProvider(id);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unable to delete provider',
    };
  }
}

export async function moderateReviewAction(
  id: string,
  status: ReviewStatus
): Promise<AdminActionResult> {
  if (!id) return { success: false, error: 'Review ID required' };

  try {
    await moderateReview(id, status);
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unable to update review',
    };
  }
}

export async function validateAdminLogin(password: string): Promise<boolean> {
  const parsed = adminLoginSchema.safeParse({ password });
  if (!parsed.success) return false;
  const secret = process.env.ADMIN_SECRET?.trim();
  return Boolean(secret && parsed.data.password === secret);
}